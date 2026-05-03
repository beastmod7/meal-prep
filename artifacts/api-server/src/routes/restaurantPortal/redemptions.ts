import { Router } from "express";
import { db, mealOrdersTable, subscriptionsTable } from "@workspace/db";
import { eq, and, gte, lte, desc, count, inArray } from "drizzle-orm";
import {
  requirePortalAuth,
  requireRestaurantAccess,
} from "../../middlewares/restaurantPortalAuth.js";

const router = Router({ mergeParams: true });

router.use(requirePortalAuth, requireRestaurantAccess);

router.get("/", async (req, res) => {
  const restaurantId = (req.params as Record<string, string>)["restaurantId"]!;
  const {
    dateFrom,
    dateTo,
    mealSlot,
    status,
    page = "1",
    limit = "50",
  } = req.query as {
    dateFrom?: string;
    dateTo?: string;
    mealSlot?: string;
    status?: string;
    page?: string;
    limit?: string;
  };

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
  const offset = (pageNum - 1) * limitNum;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]!;
  const today = new Date().toISOString().split("T")[0]!;

  const from = dateFrom ?? thirtyDaysAgo;
  const to = dateTo ?? today;

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
    conditions.push(eq(mealOrdersTable.status, status as "scheduled" | "locked" | "delivered" | "cancelled" | "no_show"));
  }

  // Total count for pagination
  const [{ total }] = await db
    .select({ total: count() })
    .from(mealOrdersTable)
    .where(and(...conditions));

  // Paged orders joined with subscription for totalDays
  const orders = await db
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
    .offset(offset);

  // Compute meal number: position of this order within its subscription
  // Fetch all order dates for the subscriptions in this page, then compute in memory
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

  // Build sorted date lists per subscription
  const subOrderDates = new Map<string, string[]>();
  for (const o of allSubOrders) {
    if (!subOrderDates.has(o.subscriptionId)) subOrderDates.set(o.subscriptionId, []);
    subOrderDates.get(o.subscriptionId)!.push(o.scheduledDate);
  }
  for (const [, dates] of subOrderDates) dates.sort();

  const items = orders.map((order) => {
    const dates = subOrderDates.get(order.subscriptionId) ?? [];
    const mealNumber = dates.indexOf(order.scheduledDate) + 1;
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
      markedBy: null as string | null,   // not yet tracked in schema
      scanMethod: null as string | null, // QR / OTP / Manual — not yet tracked
      updatedAt: order.updatedAt.toISOString(),
    };
  });

  // Summary across the full date range (unfiltered by slot/status)
  const rangeOrders = await db
    .select({ status: mealOrdersTable.status, pricePerDay: mealOrdersTable.pricePerDay })
    .from(mealOrdersTable)
    .where(
      and(
        eq(mealOrdersTable.restaurantId, restaurantId),
        gte(mealOrdersTable.scheduledDate, from),
        lte(mealOrdersTable.scheduledDate, to),
      ),
    );

  const delivered = rangeOrders.filter((o) => o.status === "delivered");
  const grossDeliveredValue = delivered.reduce((s, o) => s + parseFloat(o.pricePerDay), 0);

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
    },
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: Number(total),
      totalPages: Math.ceil(Number(total) / limitNum),
    },
    items,
  });
});

export default router;
