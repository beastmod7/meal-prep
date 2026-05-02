import { Router } from "express";
import { db } from "@workspace/db";
import { mealOrdersTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import {
  requirePortalAuth,
  requireRestaurantAccess,
} from "../../middlewares/restaurantPortalAuth.js";

const router = Router({ mergeParams: true });

router.use(requirePortalAuth, requireRestaurantAccess);

router.get("/", async (req, res) => {
  const { restaurantId } = req.params;
  const { date, mealSlot, status } = req.query as {
    date?: string;
    mealSlot?: string;
    status?: string;
  };

  const targetDate = date ?? new Date().toISOString().split("T")[0]!;

  const conditions = [
    eq(mealOrdersTable.restaurantId, restaurantId),
    eq(mealOrdersTable.scheduledDate, targetDate),
  ];

  if (mealSlot && mealSlot !== "all") {
    if (mealSlot === "lunch" || mealSlot === "dinner") {
      conditions.push(eq(mealOrdersTable.mealSlot, mealSlot));
    }
  }

  const orders = await db
    .select()
    .from(mealOrdersTable)
    .where(and(...conditions))
    .orderBy(mealOrdersTable.mealSlot, mealOrdersTable.studentName);

  const filtered =
    status && status !== "all"
      ? orders.filter((o) => o.status === status)
      : orders;

  const allOrders = orders.filter((o) => o.status !== "cancelled" && o.status !== "no_show");
  const lunchOrders = allOrders.filter((o) => o.mealSlot === "lunch");
  const dinnerOrders = allOrders.filter((o) => o.mealSlot === "dinner");

  const lockHour = 10;
  const now = new Date();
  const isLockPassed = now.getHours() >= lockHour;

  res.json({
    date: targetDate,
    lunchTotal: lunchOrders.length,
    lunchLocked: lunchOrders.filter((o) => o.isLocked).length,
    lunchCancelled: orders.filter((o) => o.mealSlot === "lunch" && o.status === "cancelled").length,
    lunchDelivered: orders.filter((o) => o.mealSlot === "lunch" && o.status === "delivered").length,
    dinnerTotal: dinnerOrders.length,
    dinnerLocked: dinnerOrders.filter((o) => o.isLocked).length,
    dinnerCancelled: orders.filter((o) => o.mealSlot === "dinner" && o.status === "cancelled").length,
    dinnerDelivered: orders.filter((o) => o.mealSlot === "dinner" && o.status === "delivered").length,
    isLockPassed,
    lockTime: "10:00 AM",
    orders: filtered.map((o) => ({
      id: o.id,
      studentName: o.studentName,
      studentPhoneMasked: o.studentPhoneMasked,
      packageName: o.packageName,
      mealSlot: o.mealSlot,
      scheduledDate: o.scheduledDate,
      status: o.status,
      freeCancelUntil: o.freeCancelUntil,
      isLocked: o.isLocked,
      pricePerDay: parseFloat(o.pricePerDay),
    })),
  });
});

router.get("/counts", async (req, res) => {
  const { restaurantId } = req.params;
  const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string };

  const today = new Date().toISOString().split("T")[0]!;
  const from = dateFrom ?? today;
  const to = dateTo ?? today;

  const orders = await db
    .select()
    .from(mealOrdersTable)
    .where(
      and(
        eq(mealOrdersTable.restaurantId, restaurantId),
        gte(mealOrdersTable.scheduledDate, from),
        lte(mealOrdersTable.scheduledDate, to),
      ),
    );

  const byDate = new Map<string, { lunch: number; dinner: number; cancelled: number }>();

  for (const order of orders) {
    const d = order.scheduledDate;
    if (!byDate.has(d)) byDate.set(d, { lunch: 0, dinner: 0, cancelled: 0 });
    const entry = byDate.get(d)!;
    if (order.status === "cancelled" || order.status === "no_show") {
      entry.cancelled++;
    } else if (order.mealSlot === "lunch") {
      entry.lunch++;
    } else {
      entry.dinner++;
    }
  }

  const result = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({
      date,
      lunch: counts.lunch,
      dinner: counts.dinner,
      total: counts.lunch + counts.dinner,
      cancelled: counts.cancelled,
    }));

  res.json(result);
});

router.patch("/:orderId/status", async (req, res) => {
  const { restaurantId, orderId } = req.params;
  const { status, note } = req.body as { status: string; note?: string };

  const validStatuses = ["accepted", "preparing", "ready", "delivered", "no_show"];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: "Bad Request", message: "Invalid status" });
    return;
  }

  const [order] = await db
    .select()
    .from(mealOrdersTable)
    .where(
      and(
        eq(mealOrdersTable.id, orderId),
        eq(mealOrdersTable.restaurantId, restaurantId),
      ),
    )
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "Not Found", message: "Order not found" });
    return;
  }

  const [updated] = await db
    .update(mealOrdersTable)
    .set({
      status: status as "accepted" | "preparing" | "ready" | "delivered" | "no_show",
      updatedAt: new Date(),
    })
    .where(eq(mealOrdersTable.id, orderId))
    .returning();

  if (!updated) {
    res.status(500).json({ error: "Internal Server Error", message: "Failed to update order" });
    return;
  }

  res.json({
    id: updated.id,
    studentName: updated.studentName,
    studentPhoneMasked: updated.studentPhoneMasked,
    packageName: updated.packageName,
    mealSlot: updated.mealSlot,
    scheduledDate: updated.scheduledDate,
    status: updated.status,
    freeCancelUntil: updated.freeCancelUntil,
    isLocked: updated.isLocked,
    pricePerDay: parseFloat(updated.pricePerDay),
  });
});

export default router;
