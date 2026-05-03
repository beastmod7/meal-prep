import { Router } from "express";
import { db } from "@workspace/db";
import {
  restaurantsTable,
  subscriptionPackagesTable,
  restaurantRatingsTable,
  mealsTable,
} from "@workspace/db";
import { eq, and, avg, count, sql } from "drizzle-orm";
import { requireStudentAuth } from "../../middlewares/studentAuth.js";

const router = Router();
router.use(requireStudentAuth);

function formatRestaurant(r: typeof restaurantsTable.$inferSelect) {
  return {
    id: r.id,
    name: r.name,
    tagline: r.tagline,
    description: r.description,
    address: r.address,
    cuisineType: r.cuisineType,
    campusId: r.campusId,
    isVeg: r.isVeg,
    lunchAvailable: r.lunchAvailable,
    dinnerAvailable: r.dinnerAvailable,
    operatingDays: r.operatingDays ? JSON.parse(r.operatingDays) : [],
    maxCapacity: r.maxCapacity,
    accentColor: r.accentColor,
    lunchStartPrice: r.lunchStartPrice ? parseFloat(r.lunchStartPrice) : null,
    dinnerStartPrice: r.dinnerStartPrice ? parseFloat(r.dinnerStartPrice) : null,
    cancelCutoffHour: r.cancelCutoffHour,
    deliveryTime: r.deliveryTime,
    distanceLabel: r.distanceLabel,
    rating: r.cachedRating ? parseFloat(r.cachedRating) : null,
    reviewCount: r.cachedReviewCount,
  };
}

// GET /api/student/restaurants?campusId=&cuisineType=&slot=lunch|dinner|both
router.get("/", async (req, res) => {
  const { campusId, slot } = req.query as { campusId?: string; slot?: string };

  const conditions = [eq(restaurantsTable.active, true)];
  if (campusId) conditions.push(eq(restaurantsTable.campusId, campusId));
  if (slot === "lunch") conditions.push(eq(restaurantsTable.lunchAvailable, true));
  if (slot === "dinner") conditions.push(eq(restaurantsTable.dinnerAvailable, true));
  if (slot === "both") {
    conditions.push(eq(restaurantsTable.lunchAvailable, true));
    conditions.push(eq(restaurantsTable.dinnerAvailable, true));
  }

  const restaurants = await db
    .select()
    .from(restaurantsTable)
    .where(and(...conditions))
    .orderBy(restaurantsTable.name);

  res.json(restaurants.map(formatRestaurant));
});

// GET /api/student/restaurants/:restaurantId
router.get("/:restaurantId", async (req, res) => {
  const { restaurantId } = req.params;

  const [restaurant] = await db
    .select()
    .from(restaurantsTable)
    .where(and(eq(restaurantsTable.id, restaurantId), eq(restaurantsTable.active, true)))
    .limit(1);

  if (!restaurant) {
    res.status(404).json({ error: "Not Found", message: "Restaurant not found" });
    return;
  }

  const [packages, meals, ratingsAgg] = await Promise.all([
    db
      .select()
      .from(subscriptionPackagesTable)
      .where(
        and(
          eq(subscriptionPackagesTable.restaurantId, restaurantId),
          eq(subscriptionPackagesTable.status, "active"),
        ),
      )
      .orderBy(subscriptionPackagesTable.validityDays),

    db
      .select()
      .from(mealsTable)
      .where(
        and(eq(mealsTable.restaurantId, restaurantId), eq(mealsTable.isActive, true)),
      )
      .orderBy(mealsTable.sortOrder),

    db
      .select({
        avgFoodQuality: avg(restaurantRatingsTable.foodQuality),
        avgPackaging: avg(restaurantRatingsTable.packaging),
        avgDelivery: avg(restaurantRatingsTable.delivery),
        avgValueForMoney: avg(restaurantRatingsTable.valueForMoney),
        avgHygiene: avg(restaurantRatingsTable.hygiene),
        avgOverall: avg(restaurantRatingsTable.overall),
        totalReviews: count(),
      })
      .from(restaurantRatingsTable)
      .where(eq(restaurantRatingsTable.restaurantId, restaurantId)),
  ]);

  const agg = ratingsAgg[0];

  res.json({
    ...formatRestaurant(restaurant),
    packages: packages.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      durationDays: p.validityDays,
      mealSlot: p.mealSlot,
      pricePerDay: parseFloat(p.pricePerDay),
      totalPrice: parseFloat(p.totalPrice),
      discountPercent: p.discountPct ? parseFloat(p.discountPct) : 0,
      mealsPerDay: p.mealSlot === "both" ? 2 : 1,
    })),
    meals: meals.map((m) => ({
      id: m.id,
      name: m.name,
      shortDescription: m.shortDescription,
      category: m.category,
      vegType: m.vegType,
      spiceLevel: m.spiceLevel,
      calories: m.calories,
      storagePath: m.imageUrl ?? null,
      lunchAvailable: m.isAvailableForLunch,
      dinnerAvailable: m.isAvailableForDinner,
    })),
    ratingsBreakdown: agg
      ? {
          totalReviews: Number(agg.totalReviews),
          overall: agg.avgOverall ? parseFloat(String(agg.avgOverall)) : null,
          foodQuality: agg.avgFoodQuality ? parseFloat(String(agg.avgFoodQuality)) : null,
          packaging: agg.avgPackaging ? parseFloat(String(agg.avgPackaging)) : null,
          delivery: agg.avgDelivery ? parseFloat(String(agg.avgDelivery)) : null,
          valueForMoney: agg.avgValueForMoney
            ? parseFloat(String(agg.avgValueForMoney))
            : null,
          hygiene: agg.avgHygiene ? parseFloat(String(agg.avgHygiene)) : null,
        }
      : null,
  });
});

// POST /api/student/restaurants/:restaurantId/rate
router.post("/:restaurantId/rate", async (req, res) => {
  const { restaurantId } = req.params;
  const {
    foodQuality,
    packaging,
    delivery,
    valueForMoney,
    hygiene,
    communication,
    overall,
    note,
  } = req.body as {
    foodQuality?: number;
    packaging?: number;
    delivery?: number;
    valueForMoney?: number;
    hygiene?: number;
    communication?: number;
    overall?: number;
    note?: string;
  };

  const fields = [foodQuality, packaging, delivery, valueForMoney, hygiene, overall];
  if (fields.some((f) => f === undefined || f < 1 || f > 5)) {
    res.status(400).json({
      error: "Bad Request",
      message: "All rating fields (foodQuality, packaging, delivery, valueForMoney, hygiene, overall) are required and must be 1-5",
    });
    return;
  }

  const { randomUUID } = await import("crypto");

  const [rating] = await db
    .insert(restaurantRatingsTable)
    .values({
      id: randomUUID(),
      studentId: req.student!.studentId,
      restaurantId,
      foodQuality: String(foodQuality),
      packaging: String(packaging),
      delivery: String(delivery),
      valueForMoney: String(valueForMoney),
      hygiene: String(hygiene),
      communication: String(communication ?? overall),
      overall: String(overall),
      note: note ?? null,
    })
    .returning();

  // Update cached rating on restaurant row
  const [agg] = await db
    .select({ avgOverall: avg(restaurantRatingsTable.overall), total: count() })
    .from(restaurantRatingsTable)
    .where(eq(restaurantRatingsTable.restaurantId, restaurantId));

  if (agg) {
    await db
      .update(restaurantsTable)
      .set({
        cachedRating: agg.avgOverall ?? null,
        cachedReviewCount: Number(agg.total),
        updatedAt: new Date(),
      })
      .where(eq(restaurantsTable.id, restaurantId));
  }

  res.status(201).json({ id: rating!.id, message: "Rating submitted" });
});

export default router;
