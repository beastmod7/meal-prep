import { Router } from "express";
import { db } from "@workspace/db";
import {
  restaurantRatingsTable,
  restaurantsTable,
  subscriptionsTable,
} from "@workspace/db";
import { eq, and, avg } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireStudentAuth } from "../../middlewares/studentAuth.js";

const router = Router();
router.use(requireStudentAuth);

// POST /api/student/ratings — submit a rating for a restaurant
router.post("/", async (req, res) => {
  const {
    restaurantId,
    foodQuality,
    packaging,
    delivery,
    valueForMoney,
    hygiene,
    communication,
    note,
  } = req.body as {
    restaurantId?: string;
    foodQuality?: number;
    packaging?: number;
    delivery?: number;
    valueForMoney?: number;
    hygiene?: number;
    communication?: number;
    note?: string;
  };

  if (!restaurantId) {
    res.status(400).json({ error: "Bad Request", message: "restaurantId is required" });
    return;
  }

  const fields = { foodQuality, packaging, delivery, valueForMoney, hygiene, communication };
  for (const [key, val] of Object.entries(fields)) {
    if (val === undefined || val === null || val < 1 || val > 5) {
      res.status(400).json({
        error: "Bad Request",
        message: `${key} must be between 1 and 5`,
      });
      return;
    }
  }

  const studentId = req.student!.studentId;

  // Verify student has an active or completed subscription to this restaurant
  const [subscription] = await db
    .select({ id: subscriptionsTable.id })
    .from(subscriptionsTable)
    .where(
      and(
        eq(subscriptionsTable.studentId, studentId),
        eq(subscriptionsTable.restaurantId, restaurantId),
      ),
    )
    .limit(1);

  if (!subscription) {
    res.status(403).json({
      error: "Forbidden",
      message: "You can only rate restaurants you have subscribed to",
    });
    return;
  }

  const [restaurant] = await db
    .select({ id: restaurantsTable.id })
    .from(restaurantsTable)
    .where(eq(restaurantsTable.id, restaurantId))
    .limit(1);

  if (!restaurant) {
    res.status(404).json({ error: "Not Found", message: "Restaurant not found" });
    return;
  }

  const overall =
    Math.round(
      ((foodQuality! + packaging! + delivery! + valueForMoney! + hygiene! + communication!) / 6) * 10,
    ) / 10;

  const ratingId = randomUUID();

  await db.insert(restaurantRatingsTable).values({
    id: ratingId,
    studentId,
    restaurantId,
    foodQuality: String(foodQuality),
    packaging: String(packaging),
    delivery: String(delivery),
    valueForMoney: String(valueForMoney),
    hygiene: String(hygiene),
    communication: String(communication),
    overall: String(overall),
    note: note ?? null,
  });

  // Update restaurant's avg rating in the restaurants table
  const [agg] = await db
    .select({ avgOverall: avg(restaurantRatingsTable.overall) })
    .from(restaurantRatingsTable)
    .where(eq(restaurantRatingsTable.restaurantId, restaurantId));

  if (agg?.avgOverall) {
    await db
      .update(restaurantsTable)
      .set({ cachedRating: String(Math.round(parseFloat(agg.avgOverall) * 10) / 10) })
      .where(eq(restaurantsTable.id, restaurantId));
  }

  res.status(201).json({
    id: ratingId,
    overall,
    message: "Rating submitted successfully",
  });
});

// GET /api/student/ratings/:restaurantId — get rating summary for a restaurant
router.get("/:restaurantId", async (req, res) => {
  const { restaurantId } = req.params;

  const ratings = await db
    .select()
    .from(restaurantRatingsTable)
    .where(eq(restaurantRatingsTable.restaurantId, restaurantId));

  if (ratings.length === 0) {
    res.json({ restaurantId, totalRatings: 0, averages: null });
    return;
  }

  const avg = (key: keyof typeof ratings[0]) =>
    Math.round(
      (ratings.reduce((s, r) => s + parseFloat(r[key] as string), 0) / ratings.length) * 10,
    ) / 10;

  res.json({
    restaurantId,
    totalRatings: ratings.length,
    averages: {
      overall: avg("overall"),
      foodQuality: avg("foodQuality"),
      packaging: avg("packaging"),
      delivery: avg("delivery"),
      valueForMoney: avg("valueForMoney"),
      hygiene: avg("hygiene"),
      communication: avg("communication"),
    },
  });
});

export default router;
