import { Router } from "express";
import { db } from "@workspace/db";
import {
  studentsTable,
  restaurantsTable,
  subscriptionPackagesTable,
  subscriptionsTable,
  mealOrdersTable,
  ledgerEntriesTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireStudentAuth } from "../../middlewares/studentAuth.js";

const router = Router();
router.use(requireStudentAuth);

function dateStr(d: Date) {
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().split("T")[0]!;
}

function freeCancelUntilForDate(scheduledDateStr: string): string {
  const [year, month, day] = scheduledDateStr.split("-").map(Number);
  const prevDay = new Date(Date.UTC(year!, month! - 1, day! - 1, 16, 30, 0));
  return prevDay.toISOString();
}

// GET /api/student/free-meal — eligibility check
router.get("/", async (req, res) => {
  const [student] = await db
    .select({ freeTrialUsed: studentsTable.freeTrialUsed })
    .from(studentsTable)
    .where(eq(studentsTable.id, req.student!.studentId))
    .limit(1);

  res.json({ eligible: !(student?.freeTrialUsed ?? true) });
});

// POST /api/student/free-meal/book
router.post("/book", async (req, res) => {
  const { restaurantId, slot } = req.body as {
    restaurantId?: string;
    slot?: "lunch" | "dinner";
  };

  if (!restaurantId || !slot) {
    res.status(400).json({ message: "restaurantId and slot required" });
    return;
  }

  const studentId = req.student!.studentId;

  const [[student], [restaurant]] = await Promise.all([
    db.select().from(studentsTable).where(eq(studentsTable.id, studentId)).limit(1),
    db.select().from(restaurantsTable).where(eq(restaurantsTable.id, restaurantId)).limit(1),
  ]);

  if (!student) {
    res.status(404).json({ message: "Student not found" });
    return;
  }
  if (student.freeTrialUsed) {
    res.status(409).json({ message: "Free trial already used" });
    return;
  }
  if (!restaurant) {
    res.status(404).json({ message: "Restaurant not found" });
    return;
  }

  // Find the cheapest active package matching the slot
  const packages = await db
    .select()
    .from(subscriptionPackagesTable)
    .where(
      and(
        eq(subscriptionPackagesTable.restaurantId, restaurantId),
        eq(subscriptionPackagesTable.status, "active"),
      ),
    );

  const matching = packages
    .filter((p) => p.mealSlot === slot || p.mealSlot === "both")
    .sort((a, b) => parseFloat(a.pricePerDay) - parseFloat(b.pricePerDay));

  const pkg = matching[0];
  if (!pkg) {
    res.status(404).json({ message: "No packages available for this restaurant and slot" });
    return;
  }

  const today = dateStr(new Date());
  const subId = randomUUID();
  const orderId = randomUUID();

  const phoneMasked =
    student.phone.length >= 10
      ? `${student.phone.slice(0, -4).replace(/\d/g, "*")}${student.phone.slice(-4)}`
      : student.phone;

  const freeCancelUntil = freeCancelUntilForDate(today);

  await db.transaction(async (tx) => {
    await tx.insert(subscriptionsTable).values({
      id: subId,
      studentId,
      restaurantId,
      packageId: pkg.id,
      restaurantName: restaurant.name,
      packageName: "Free Trial Meal",
      mealSlot: slot,
      totalDays: 1,
      usedDays: 0,
      remainingDays: 1,
      pricePerDay: "0",
      totalPaid: "0",
      startDate: today,
      endDate: today,
      status: "active",
      lateCancellationFees: "0",
    });

    await tx.insert(mealOrdersTable).values({
      id: orderId,
      studentId,
      restaurantId,
      subscriptionId: subId,
      packageId: pkg.id,
      packageName: "Free Trial Meal",
      studentName: student.name,
      studentPhoneMasked: phoneMasked,
      mealSlot: slot,
      scheduledDate: today,
      status: "scheduled",
      pricePerDay: "0",
      freeCancelUntil,
      isLocked: false,
    });

    await tx.insert(ledgerEntriesTable).values({
      id: randomUUID(),
      studentId,
      subscriptionId: subId,
      restaurantName: restaurant.name,
      type: "free_trial",
      description: `Free trial ${slot} — ${restaurant.name}`,
      amountDelta: "0",
    });

    await tx
      .update(studentsTable)
      .set({ freeTrialUsed: true, updatedAt: new Date() })
      .where(eq(studentsTable.id, studentId));
  });

  res.status(201).json({
    subscriptionId: subId,
    orderId,
    restaurantName: restaurant.name,
    slot,
    scheduledDate: today,
    message: "Free trial meal booked!",
  });
});

export default router;
