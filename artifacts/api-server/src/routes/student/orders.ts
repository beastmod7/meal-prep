import { Router } from "express";
import { db } from "@workspace/db";
import {
  mealOrdersTable,
  cancellationsTable,
  subscriptionsTable,
  ledgerEntriesTable,
} from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireStudentAuth } from "../../middlewares/studentAuth.js";

const router = Router();
router.use(requireStudentAuth);

function nowIST(): Date {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000);
}

function lateCancelUntilForOrder(scheduledDate: string, slot: string): string {
  const [y, m, d] = scheduledDate.split("-").map(Number);
  // lunch cutoff: 09:00 IST = 03:30 UTC; dinner cutoff: 15:00 IST = 09:30 UTC
  const cutoffHourUTC = slot === "lunch" ? 3.5 : 9.5;
  const cutoffMs = Date.UTC(y!, m! - 1, d!) + cutoffHourUTC * 3600000;
  return new Date(cutoffMs).toISOString();
}

type OrderCancelFields = {
  status: string;
  isLocked: boolean;
  freeCancelUntil: string;
};

type OrderWithRestaurant = typeof mealOrdersTable.$inferSelect & {
  restaurantName: string | null;
};

function getCancelStatus(order: OrderCancelFields): "free" | "late" | "full" | "none" {
  if (order.status !== "scheduled") return "none";
  if (order.isLocked) return "full";

  const now = nowIST();
  const freeUntil = new Date(order.freeCancelUntil);
  if (now < freeUntil) return "free";
  return "late";
}

function formatOrder(o: OrderWithRestaurant) {
  const cancelStatus = getCancelStatus(o);
  return {
    id: o.id,
    subscriptionId: o.subscriptionId,
    restaurantId: o.restaurantId,
    restaurantName: o.restaurantName ?? o.packageName,
    mealName: o.packageName,
    slot: o.mealSlot as "lunch" | "dinner",
    scheduledDate: o.scheduledDate,
    status: o.status,
    pricePerDay: parseFloat(o.pricePerDay),
    freeCancelUntil: o.freeCancelUntil,
    lateCancelUntil: lateCancelUntilForOrder(o.scheduledDate, o.mealSlot),
    isLocked: o.isLocked,
    cancelStatus,
  };
}

// GET /api/student/orders?from=&to=&status=
router.get("/", async (req, res) => {
  const { from, to, status } = req.query as { from?: string; to?: string; status?: string };
  const studentId = req.student!.studentId;

  const conditions = [eq(mealOrdersTable.studentId, studentId)];
  if (from) conditions.push(gte(mealOrdersTable.scheduledDate, from));
  if (to) conditions.push(lte(mealOrdersTable.scheduledDate, to));

  const rows = await db
    .select({
      id: mealOrdersTable.id,
      studentId: mealOrdersTable.studentId,
      restaurantId: mealOrdersTable.restaurantId,
      subscriptionId: mealOrdersTable.subscriptionId,
      packageId: mealOrdersTable.packageId,
      packageName: mealOrdersTable.packageName,
      studentName: mealOrdersTable.studentName,
      studentPhoneMasked: mealOrdersTable.studentPhoneMasked,
      mealSlot: mealOrdersTable.mealSlot,
      scheduledDate: mealOrdersTable.scheduledDate,
      status: mealOrdersTable.status,
      pricePerDay: mealOrdersTable.pricePerDay,
      freeCancelUntil: mealOrdersTable.freeCancelUntil,
      isLocked: mealOrdersTable.isLocked,
      createdAt: mealOrdersTable.createdAt,
      updatedAt: mealOrdersTable.updatedAt,
      restaurantName: subscriptionsTable.restaurantName,
    })
    .from(mealOrdersTable)
    .leftJoin(subscriptionsTable, eq(mealOrdersTable.subscriptionId, subscriptionsTable.id))
    .where(and(...conditions))
    .orderBy(desc(mealOrdersTable.scheduledDate));

  const filtered =
    status && status !== "all"
      ? rows.filter((o) => o.status === status)
      : rows;

  res.json(filtered.map(formatOrder));
});

// POST /api/student/orders/:orderId/cancel
router.post("/:orderId/cancel", async (req, res) => {
  const { orderId } = req.params;
  const studentId = req.student!.studentId;

  const [orderRow] = await db
    .select({
      id: mealOrdersTable.id,
      studentId: mealOrdersTable.studentId,
      restaurantId: mealOrdersTable.restaurantId,
      subscriptionId: mealOrdersTable.subscriptionId,
      packageId: mealOrdersTable.packageId,
      packageName: mealOrdersTable.packageName,
      studentName: mealOrdersTable.studentName,
      studentPhoneMasked: mealOrdersTable.studentPhoneMasked,
      mealSlot: mealOrdersTable.mealSlot,
      scheduledDate: mealOrdersTable.scheduledDate,
      status: mealOrdersTable.status,
      pricePerDay: mealOrdersTable.pricePerDay,
      freeCancelUntil: mealOrdersTable.freeCancelUntil,
      isLocked: mealOrdersTable.isLocked,
      updatedAt: mealOrdersTable.updatedAt,
      restaurantName: subscriptionsTable.restaurantName,
    })
    .from(mealOrdersTable)
    .leftJoin(subscriptionsTable, eq(mealOrdersTable.subscriptionId, subscriptionsTable.id))
    .where(and(eq(mealOrdersTable.id, orderId), eq(mealOrdersTable.studentId, studentId)))
    .limit(1);

  if (!orderRow) {
    res.status(404).json({ error: "Not Found", message: "Order not found" });
    return;
  }

  if (orderRow.status !== "scheduled") {
    res.status(400).json({
      error: "Bad Request",
      message: `Cannot cancel an order with status '${orderRow.status}'`,
    });
    return;
  }

  const cancelType = getCancelStatus(orderRow);
  if (cancelType === "none") {
    res.status(400).json({ error: "Bad Request", message: "Order cannot be cancelled" });
    return;
  }

  const pricePerDay = parseFloat(orderRow.pricePerDay);

  const feePercent = cancelType === "free" ? 0 : cancelType === "late" ? 0.5 : 1;
  const fee = Math.round(pricePerDay * feePercent * 100) / 100;
  const refund = pricePerDay - fee;

  const cancellationType =
    cancelType === "free"
      ? "free_cancellation"
      : cancelType === "late"
        ? "late_cancellation"
        : "no_show";

  const newStatus =
    cancelType === "free"
      ? "cancelled_free"
      : cancelType === "late"
        ? "cancelled_late"
        : "cancelled_full";

  await db.transaction(async (tx) => {
    await tx
      .update(mealOrdersTable)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(mealOrdersTable.id, orderId));

    await tx.insert(cancellationsTable).values({
      id: randomUUID(),
      orderId: orderRow.id,
      restaurantId: orderRow.restaurantId,
      studentName: orderRow.studentName,
      packageName: orderRow.packageName,
      mealSlot: orderRow.mealSlot,
      mealDate: orderRow.scheduledDate,
      cancellationType,
      deductionAmount: String(fee),
      restaurantPayout: String(cancelType === "free" ? 0 : fee * 0.7),
    });

    if (fee > 0) {
      await tx.insert(ledgerEntriesTable).values({
        id: randomUUID(),
        studentId,
        subscriptionId: orderRow.subscriptionId,
        restaurantName: orderRow.restaurantName ?? null,
        type: cancelType === "late" ? "late_cancel" : "full_charge",
        description: `Cancellation fee — ${orderRow.packageName} ${orderRow.mealSlot} on ${orderRow.scheduledDate}`,
        amountDelta: String(-fee),
      });
    }

    if (refund > 0) {
      await tx.insert(ledgerEntriesTable).values({
        id: randomUUID(),
        studentId,
        subscriptionId: orderRow.subscriptionId,
        restaurantName: orderRow.restaurantName ?? null,
        type: "free_cancel",
        description: `Cancellation refund — ${orderRow.packageName} ${orderRow.mealSlot} on ${orderRow.scheduledDate}`,
        amountDelta: String(refund),
      });
    }

    if (cancelType === "free") {
      const [sub] = await tx
        .select()
        .from(subscriptionsTable)
        .where(eq(subscriptionsTable.id, orderRow.subscriptionId))
        .limit(1);
      if (sub && sub.remainingDays > 0) {
        await tx
          .update(subscriptionsTable)
          .set({ remainingDays: sub.remainingDays - 1, updatedAt: new Date() })
          .where(eq(subscriptionsTable.id, sub.id));
      }
    }
  });

  res.json({
    type: cancelType,
    fee,
    refund,
    message:
      cancelType === "free"
        ? "Order cancelled with no charge"
        : cancelType === "late"
          ? `Late cancellation fee of ₹${fee} applied`
          : `Full charge of ₹${fee} applied (locked order)`,
  });
});

export default router;
