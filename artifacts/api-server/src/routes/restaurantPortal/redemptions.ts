import { Router } from "express";
import { db, mealOrdersTable, subscriptionsTable, settlementPeriodsTable } from "@workspace/db";
import { eq, and, gte, lte, desc, count, inArray, ilike, or } from "drizzle-orm";
import {
  requirePortalAuth,
  requireRestaurantAccess,
} from "../../middlewares/restaurantPortalAuth.js";

const router = Router({ mergeParams: true });

router.use(requirePortalAuth, requireRestaurantAccess);

function fmt(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getToday(): string {
  return fmt(new Date());
}

function getPresetDates(preset: string): { from: string; to: string } {
  const now = new Date();
  const today = fmt(now);
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "week": {
      const mon = new Date(now);
      mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      return { from: fmt(mon), to: today };
    }
    case "month": {
      return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
    }
    case "last30":
    default: {
      return { from: fmt(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)), to: today };
    }
  }
}

router.get("/", async (req, res) => {
  const restaurantId = (req.params as Record<string, string>)["restaurantId"]!;
  const {
    dateFrom,
    dateTo,
    mealSlot,
    status,
    search,
    preset,
    exportAll,
    page = "1",
    limit = "50",
  } = req.query as Record<string, string | undefined>;

  const today = getToday();
  const thirtyDaysAgo = fmt(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

  const presetDates = preset ? getPresetDates(preset) : null;
  const from = presetDates?.from ?? dateFrom ?? thirtyDaysAgo;
  const to = presetDates?.to ?? dateTo ?? today;

  const isExportAll = exportAll === "true";
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = isExportAll ? 1000 : Math.min(200, Math.max(1, parseInt(limit) || 50));
  const offset = isExportAll ? 0 : (pageNum - 1) * limitNum;

  const conditions = [
    eq(mealOrdersTable.restaurantId, restaurantId),
    gte(mealOrdersTable.scheduledDate, from),
    lte(mealOrdersTable.scheduledDate, to),
  ];

  if (mealSlot && mealSlot !== "all" && (mealSlot === "lunch" || mealSlot === "dinner")) {
    conditions.push(eq(mealOrdersTable.mealSlot, mealSlot));
  }

  const validStatuses = ["scheduled", "locked", "delivered", "cancelled", "no_show"];
  if (status && status !== "all" && validStatuses.includes(status)) {
    conditions.push(
      eq(
        mealOrdersTable.status,
        status as "scheduled" | "locked" | "delivered" | "cancelled" | "no_show",
      ),
    );
  }

  if (search && search.trim()) {
    const pattern = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(mealOrdersTable.studentName, pattern),
        ilike(mealOrdersTable.studentPhoneMasked, pattern),
      )!,
    );
  }

  // Fetch settlement periods once — used to tag each order with its settlement status
  const [settlementPeriods, totalResult, orders] = await Promise.all([
    db
      .select({
        id: settlementPeriodsTable.id,
        periodStart: settlementPeriodsTable.periodStart,
        periodEnd: settlementPeriodsTable.periodEnd,
        status: settlementPeriodsTable.status,
      })
      .from(settlementPeriodsTable)
      .where(eq(settlementPeriodsTable.restaurantId, restaurantId)),

    db.select({ total: count() }).from(mealOrdersTable).where(and(...conditions)),

    db
      .select({
        id: mealOrdersTable.id,
        subscriptionId: mealOrdersTable.subscriptionId,
        packageName: mealOrdersTable.packageName,
        studentName: mealOrdersTable.studentName,
        studentPhoneMasked: mealOrdersTable.studentPhoneMasked,
        mealSlot: mealOrdersTable.mealSlot,
        scheduledDate: mealOrdersTable.scheduledDate,
        status: mealOrdersTable.status,
        pricePerDay: mealOrdersTable.pricePerDay,
        updatedAt: mealOrdersTable.updatedAt,
        totalDays: subscriptionsTable.totalDays,
      })
      .from(mealOrdersTable)
      .leftJoin(subscriptionsTable, eq(mealOrdersTable.subscriptionId, subscriptionsTable.id))
      .where(and(...conditions))
      .orderBy(desc(mealOrdersTable.scheduledDate))
      .limit(limitNum)
      .offset(offset),
  ]);

  // Compute meal position in memory — one extra query for all subscription order dates
  const subIds = [...new Set(orders.map((o) => o.subscriptionId))];
  const allSubOrders =
    subIds.length > 0
      ? await db
          .select({
            subscriptionId: mealOrdersTable.subscriptionId,
            scheduledDate: mealOrdersTable.scheduledDate,
          })
          .from(mealOrdersTable)
          .where(inArray(mealOrdersTable.subscriptionId, subIds))
      : [];

  const subOrderDates = new Map<string, string[]>();
  for (const o of allSubOrders) {
    if (!subOrderDates.has(o.subscriptionId)) subOrderDates.set(o.subscriptionId, []);
    subOrderDates.get(o.subscriptionId)!.push(o.scheduledDate);
  }
  for (const [, dates] of subOrderDates) dates.sort();

  const findSettlement = (scheduledDate: string) =>
    settlementPeriods.find((p) => scheduledDate >= p.periodStart && scheduledDate <= p.periodEnd) ??
    null;

  const items = orders.map((order) => {
    const dates = subOrderDates.get(order.subscriptionId) ?? [];
    const mealNumber = dates.indexOf(order.scheduledDate) + 1;
    const settlement = findSettlement(order.scheduledDate);
    return {
      id: order.id,
      subscriptionId: order.subscriptionId,
      packageName: order.packageName,
      studentName: order.studentName,
      studentPhoneMasked: order.studentPhoneMasked,
      mealSlot: order.mealSlot,
      scheduledDate: order.scheduledDate,
      status: order.status,
      pricePerDay: parseFloat(order.pricePerDay),
      mealNumber,
      totalDays: order.totalDays ?? null,
      settlementStatus: settlement?.status ?? null,
      settlementPeriodId: settlement?.id ?? null,
      markedBy: null as string | null,
      scanMethod: null as string | null,
      updatedAt: order.updatedAt.toISOString(),
    };
  });

  // Summary stats — range-wide, ignoring slot/status/search filters
  const [rangeOrders, todayOrders] = await Promise.all([
    db
      .select({ status: mealOrdersTable.status, pricePerDay: mealOrdersTable.pricePerDay })
      .from(mealOrdersTable)
      .where(
        and(
          eq(mealOrdersTable.restaurantId, restaurantId),
          gte(mealOrdersTable.scheduledDate, from),
          lte(mealOrdersTable.scheduledDate, to),
        ),
      ),
    db
      .select({ status: mealOrdersTable.status })
      .from(mealOrdersTable)
      .where(
        and(
          eq(mealOrdersTable.restaurantId, restaurantId),
          eq(mealOrdersTable.scheduledDate, today),
        ),
      ),
  ]);

  const delivered = rangeOrders.filter((o) => o.status === "delivered");
  const grossDeliveredValue = delivered.reduce((s, o) => s + parseFloat(o.pricePerDay), 0);
  const avgMealValue =
    delivered.length > 0 ? Math.round((grossDeliveredValue / delivered.length) * 100) / 100 : 0;

  const todayDelivered = todayOrders.filter((o) => o.status === "delivered").length;
  const todayExpected = todayOrders.filter(
    (o) => o.status === "scheduled" || o.status === "locked" || o.status === "delivered",
  ).length;

  res.json({
    summary: {
      totalDelivered: delivered.length,
      totalScheduled: rangeOrders.filter(
        (o) => o.status === "scheduled" || o.status === "locked",
      ).length,
      totalCancelled: rangeOrders.filter(
        (o) => o.status === "cancelled" || o.status === "no_show",
      ).length,
      grossDeliveredValue,
      avgMealValue,
      todayDelivered,
      todayExpected,
    },
    pagination: {
      page: isExportAll ? 1 : pageNum,
      limit: limitNum,
      total: Number(totalResult[0]!.total),
      totalPages: isExportAll ? 1 : Math.ceil(Number(totalResult[0]!.total) / limitNum),
    },
    items,
  });
});

export default router;
