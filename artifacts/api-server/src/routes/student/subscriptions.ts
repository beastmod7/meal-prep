import { Router } from "express";
import { db } from "@workspace/db";
import {
  subscriptionsTable,
  mealOrdersTable,
  subscriptionPackagesTable,
  restaurantsTable,
  ledgerEntriesTable,
  studentsTable,
} from "@workspace/db";
import { eq, and, between, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireStudentAuth } from "../../middlewares/studentAuth.js";

const router = Router();
router.use(requireStudentAuth);

function dateStr(d: Date) {
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().split("T")[0]!;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!) + days * 86400000)
    .toISOString()
    .split("T")[0]!;
}

function freeCancelUntilForDate(scheduledDateStr: string): string {
  const [year, month, day] = scheduledDateStr.split("-").map(Number);
  const prevDay = new Date(Date.UTC(year!, month! - 1, day! - 1, 16, 30, 0));
  return prevDay.toISOString();
}

function generateOrdersForSubscription(sub: {
  id: string;
  studentId: string;
  restaurantId: string;
  packageId: string;
  packageName: string;
  studentName: string;
  studentPhoneMasked: string;
  mealSlot: string;
  totalDays: number;
  pricePerDay: number;
  startDate: string;
}): Array<typeof mealOrdersTable.$inferInsert> {
  const orders: Array<typeof mealOrdersTable.$inferInsert> = [];
  const pricePerMeal =
    sub.mealSlot === "both"
      ? Math.round(sub.pricePerDay / 2)
      : sub.pricePerDay;

  for (let i = 0; i < sub.totalDays; i++) {
    const [y, m, d] = sub.startDate.split("-").map(Number);
    const dateMs = Date.UTC(y!, m! - 1, d!) + i * 86400000;
    const scheduled = new Date(dateMs);
    const scheduledDate = scheduled.toISOString().split("T")[0]!;
    const freeCancelUntil = freeCancelUntilForDate(scheduledDate);

    const slots: ("lunch" | "dinner")[] =
      sub.mealSlot === "both"
        ? ["lunch", "dinner"]
        : [sub.mealSlot as "lunch" | "dinner"];

    for (const slot of slots) {
      orders.push({
        id: randomUUID(),
        studentId: sub.studentId,
        restaurantId: sub.restaurantId,
        subscriptionId: sub.id,
        packageId: sub.packageId,
        packageName: sub.packageName,
        studentName: sub.studentName,
        studentPhoneMasked: sub.studentPhoneMasked,
        mealSlot: slot,
        scheduledDate,
        status: "scheduled",
        pricePerDay: String(pricePerMeal),
        freeCancelUntil,
        isLocked: false,
      });
    }
  }

  return orders;
}

function formatSubscription(s: typeof subscriptionsTable.$inferSelect) {
  return {
    id: s.id,
    restaurantId: s.restaurantId,
    restaurantName: s.restaurantName,
    packageId: s.packageId,
    packageName: s.packageName,
    slot: s.mealSlot,
    totalDays: s.totalDays,
    usedDays: s.usedDays,
    remainingDays: s.remainingDays,
    pricePerDay: parseFloat(s.pricePerDay),
    totalPaid: parseFloat(s.totalPaid),
    startDate: s.startDate,
    endDate: s.endDate,
    status: s.status,
    pausedUntil: s.pausedUntil,
    lateCancellationFees: parseFloat(s.lateCancellationFees ?? "0"),
    createdAt: s.createdAt.toISOString(),
  };
}

// GET /api/student/subscriptions
router.get("/", async (req, res) => {
  const subs = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.studentId, req.student!.studentId))
    .orderBy(desc(subscriptionsTable.createdAt));

  res.json(subs.map(formatSubscription));
});

// POST /api/student/subscriptions — purchase a subscription
router.post("/", async (req, res) => {
  const { restaurantId, packageId, startDate } = req.body as {
    restaurantId?: string;
    packageId?: string;
    startDate?: string;
  };

  if (!restaurantId || !packageId) {
    res
      .status(400)
      .json({ error: "Bad Request", message: "restaurantId and packageId required" });
    return;
  }

  const studentId = req.student!.studentId;

  const [[restaurant], [pkg], [student]] = await Promise.all([
    db.select().from(restaurantsTable).where(eq(restaurantsTable.id, restaurantId)).limit(1),
    db
      .select()
      .from(subscriptionPackagesTable)
      .where(
        and(
          eq(subscriptionPackagesTable.id, packageId),
          eq(subscriptionPackagesTable.restaurantId, restaurantId),
          eq(subscriptionPackagesTable.status, "active"),
        ),
      )
      .limit(1),
    db.select().from(studentsTable).where(eq(studentsTable.id, studentId)).limit(1),
  ]);

  if (!restaurant) {
    res.status(404).json({ error: "Not Found", message: "Restaurant not found" });
    return;
  }
  if (!pkg) {
    res.status(404).json({ error: "Not Found", message: "Package not found or inactive" });
    return;
  }
  if (!student) {
    res.status(404).json({ error: "Not Found", message: "Student not found" });
    return;
  }

  const today = dateStr(new Date());
  const subStart = startDate ?? today;
  const [sy, sm, sd] = subStart.split("-").map(Number);
  const endMs = Date.UTC(sy!, sm! - 1, sd!) + (pkg.validityDays - 1) * 86400000;
  const subEnd = new Date(endMs).toISOString().split("T")[0]!;

  const pricePerDay = parseFloat(pkg.pricePerDay);
  const totalPaid = parseFloat(pkg.totalPrice);

  const subId = randomUUID();

  const phoneMasked =
    student.phone.length >= 10
      ? `${student.phone.slice(0, -4).replace(/\d/g, "*")}${student.phone.slice(-4)}`
      : student.phone;

  const subscription: typeof subscriptionsTable.$inferInsert = {
    id: subId,
    studentId,
    restaurantId,
    packageId,
    restaurantName: restaurant.name,
    packageName: pkg.name,
    mealSlot: pkg.mealSlot,
    totalDays: pkg.validityDays,
    usedDays: 0,
    remainingDays: pkg.validityDays,
    pricePerDay: String(pricePerDay),
    totalPaid: String(totalPaid),
    startDate: subStart,
    endDate: subEnd,
    status: "active",
    lateCancellationFees: "0",
  };

  const orders = generateOrdersForSubscription({
    id: subId,
    studentId,
    restaurantId,
    packageId,
    packageName: pkg.name,
    studentName: student.name,
    studentPhoneMasked: phoneMasked,
    mealSlot: pkg.mealSlot,
    totalDays: pkg.validityDays,
    pricePerDay,
    startDate: subStart,
  });

  const ledgerEntry: typeof ledgerEntriesTable.$inferInsert = {
    id: randomUUID(),
    studentId,
    subscriptionId: subId,
    restaurantName: restaurant.name,
    type: "subscription_purchase",
    description: `${restaurant.name} ${pkg.mealSlot} — ${pkg.validityDays}-day subscription`,
    amountDelta: String(-totalPaid),
  };

  // Atomic insert: subscription + all orders + ledger entry + wallet debit
  await db.transaction(async (tx) => {
    await tx.insert(subscriptionsTable).values(subscription);
    if (orders.length > 0) {
      await tx.insert(mealOrdersTable).values(orders);
    }
    await tx.insert(ledgerEntriesTable).values(ledgerEntry);

    // Debit wallet balance
    await tx
      .update(studentsTable)
      .set({
        walletBalance: sql`${studentsTable.walletBalance} - ${totalPaid}`,
        updatedAt: new Date(),
      })
      .where(eq(studentsTable.id, studentId));

    // Increment active subscriber count on package
    await tx
      .update(subscriptionPackagesTable)
      .set({
        activeSubscribers: (pkg.activeSubscribers ?? 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionPackagesTable.id, packageId));
  });

  const [created] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.id, subId))
    .limit(1);

  res.status(201).json({
    subscription: formatSubscription(created!),
    ordersCreated: orders.length,
    message: `Subscription created with ${orders.length} meal orders`,
  });
});

// GET /api/student/subscriptions/:subId
router.get("/:subId", async (req, res) => {
  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(
      and(
        eq(subscriptionsTable.id, req.params.subId),
        eq(subscriptionsTable.studentId, req.student!.studentId),
      ),
    )
    .limit(1);

  if (!sub) {
    res.status(404).json({ error: "Not Found", message: "Subscription not found" });
    return;
  }

  res.json(formatSubscription(sub));
});

// POST /api/student/subscriptions/:subId/cancel
router.post("/:subId/cancel", async (req, res) => {
  const { reason } = req.body as { reason?: string };

  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(
      and(
        eq(subscriptionsTable.id, req.params.subId),
        eq(subscriptionsTable.studentId, req.student!.studentId),
      ),
    )
    .limit(1);

  if (!sub) {
    res.status(404).json({ error: "Not Found", message: "Subscription not found" });
    return;
  }

  if (sub.status !== "active" && sub.status !== "paused") {
    res.status(400).json({
      error: "Bad Request",
      message: `Cannot cancel a subscription with status '${sub.status}'`,
    });
    return;
  }

  const today = dateStr(new Date());

  // Count future unlocked scheduled orders to compute accurate refund
  const futureOrders = await db
    .select({ id: mealOrdersTable.id, pricePerDay: mealOrdersTable.pricePerDay })
    .from(mealOrdersTable)
    .where(
      and(
        eq(mealOrdersTable.subscriptionId, sub.id),
        eq(mealOrdersTable.status, "scheduled"),
        eq(mealOrdersTable.isLocked, false),
      ),
    );

  const refundAmount = futureOrders.reduce(
    (sum, o) => sum + parseFloat(o.pricePerDay),
    0,
  );

  await db.transaction(async (tx) => {
    // Cancel all future unlocked scheduled orders
    await tx
      .update(mealOrdersTable)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(
        and(
          eq(mealOrdersTable.subscriptionId, sub.id),
          eq(mealOrdersTable.status, "scheduled"),
          eq(mealOrdersTable.isLocked, false),
        ),
      );

    await tx
      .update(subscriptionsTable)
      .set({
        status: "cancelled",
        cancelReason: reason ?? null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionsTable.id, sub.id));

    if (refundAmount > 0) {
      await tx.insert(ledgerEntriesTable).values({
        id: randomUUID(),
        studentId: req.student!.studentId,
        subscriptionId: sub.id,
        restaurantName: sub.restaurantName,
        type: "subscription_cancel_refund",
        description: `Refund: ${sub.restaurantName} ${sub.mealSlot} subscription cancelled`,
        amountDelta: String(refundAmount),
      });

      // Credit wallet back
      await tx
        .update(studentsTable)
        .set({
          walletBalance: sql`${studentsTable.walletBalance} + ${refundAmount}`,
          updatedAt: new Date(),
        })
        .where(eq(studentsTable.id, req.student!.studentId));
    }

    // Decrement subscriber count
    const [pkg] = await tx
      .select()
      .from(subscriptionPackagesTable)
      .where(eq(subscriptionPackagesTable.id, sub.packageId ?? ""))
      .limit(1);

    if (pkg && (pkg.activeSubscribers ?? 0) > 0) {
      await tx
        .update(subscriptionPackagesTable)
        .set({
          activeSubscribers: pkg.activeSubscribers - 1,
          updatedAt: new Date(),
        })
        .where(eq(subscriptionPackagesTable.id, pkg.id));
    }
  });

  res.json({
    message: "Subscription cancelled",
    refundAmount,
    ordersRefunded: futureOrders.length,
  });
});

// POST /api/student/subscriptions/:subId/pause
router.post("/:subId/pause", async (req, res) => {
  const { pauseDays } = req.body as { pauseDays?: number };

  if (!pauseDays || pauseDays < 1 || pauseDays > 30) {
    res.status(400).json({ error: "Bad Request", message: "pauseDays must be 1-30" });
    return;
  }

  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(
      and(
        eq(subscriptionsTable.id, req.params.subId),
        eq(subscriptionsTable.studentId, req.student!.studentId),
      ),
    )
    .limit(1);

  if (!sub) {
    res.status(404).json({ error: "Not Found", message: "Subscription not found" });
    return;
  }

  if (sub.status !== "active") {
    res
      .status(400)
      .json({ error: "Bad Request", message: "Only active subscriptions can be paused" });
    return;
  }

  const today = dateStr(new Date());
  const pausedUntil = addDays(today, pauseDays);
  // Extend end date by the number of paused days
  const newEndDate = addDays(sub.endDate, pauseDays);

  await db.transaction(async (tx) => {
    // Cancel unlocked scheduled orders that fall within the pause window
    const pauseOrders = await tx
      .select({ id: mealOrdersTable.id })
      .from(mealOrdersTable)
      .where(
        and(
          eq(mealOrdersTable.subscriptionId, sub.id),
          eq(mealOrdersTable.status, "scheduled"),
          eq(mealOrdersTable.isLocked, false),
          between(mealOrdersTable.scheduledDate, today, pausedUntil),
        ),
      );

    if (pauseOrders.length > 0) {
      await tx
        .update(mealOrdersTable)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(
          and(
            eq(mealOrdersTable.subscriptionId, sub.id),
            eq(mealOrdersTable.status, "scheduled"),
            eq(mealOrdersTable.isLocked, false),
            between(mealOrdersTable.scheduledDate, today, pausedUntil),
          ),
        );
    }

    await tx
      .update(subscriptionsTable)
      .set({
        status: "paused",
        pausedUntil,
        endDate: newEndDate,
        remainingDays: Math.max(0, sub.remainingDays - pauseOrders.length),
        updatedAt: new Date(),
      })
      .where(eq(subscriptionsTable.id, sub.id));
  });

  res.json({ message: "Subscription paused", pausedUntil, newEndDate });
});

// POST /api/student/subscriptions/:subId/resume
router.post("/:subId/resume", async (req, res) => {
  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(
      and(
        eq(subscriptionsTable.id, req.params.subId),
        eq(subscriptionsTable.studentId, req.student!.studentId),
      ),
    )
    .limit(1);

  if (!sub) {
    res.status(404).json({ error: "Not Found", message: "Subscription not found" });
    return;
  }

  if (sub.status !== "paused") {
    res.status(400).json({ error: "Bad Request", message: "Only paused subscriptions can be resumed" });
    return;
  }

  await db
    .update(subscriptionsTable)
    .set({ status: "active", pausedUntil: null, updatedAt: new Date() })
    .where(eq(subscriptionsTable.id, sub.id));

  res.json({ message: "Subscription resumed" });
});

export default router;
