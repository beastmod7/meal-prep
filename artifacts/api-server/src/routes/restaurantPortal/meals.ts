import { Router } from "express";
import { db } from "@workspace/db";
import { mealsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  requirePortalAuth,
  requireRestaurantAccess,
} from "../../middlewares/restaurantPortalAuth.js";
import { randomUUID } from "crypto";

const router = Router({ mergeParams: true });

router.use(requirePortalAuth, requireRestaurantAccess);

const toResponse = (m: typeof mealsTable.$inferSelect) => ({
  id: m.id,
  restaurantId: m.restaurantId,
  name: m.name,
  shortDescription: m.shortDescription,
  description: m.description,
  category: m.category,
  vegType: m.vegType,
  calories: m.calories,
  protein: m.protein,
  carbs: m.carbs,
  fat: m.fat,
  fiber: m.fiber,
  allergens: m.allergens,
  spiceLevel: m.spiceLevel,
  imageUrl: m.imageUrl,
  isAvailableForLunch: m.isAvailableForLunch,
  isAvailableForDinner: m.isAvailableForDinner,
  isActive: m.isActive,
  sortOrder: m.sortOrder,
  createdAt: m.createdAt.toISOString(),
  updatedAt: m.updatedAt.toISOString(),
});

router.get("/", async (req, res) => {
  const restaurantId = (req.params as Record<string, string>)["restaurantId"]!;
  const { isActive, category } = req.query as { isActive?: string; category?: string };

  const conditions = [eq(mealsTable.restaurantId, restaurantId)];

  if (isActive && isActive !== "all") {
    conditions.push(eq(mealsTable.isActive, isActive === "true"));
  }

  if (category && category !== "all") {
    conditions.push(eq(mealsTable.category, category));
  }

  const meals = await db
    .select()
    .from(mealsTable)
    .where(and(...conditions))
    .orderBy(mealsTable.sortOrder, mealsTable.createdAt);

  res.json(meals.map(toResponse));
});

router.post("/", async (req, res) => {
  const restaurantId = (req.params as Record<string, string>)["restaurantId"]!;
  const body = req.body as {
    name: string;
    shortDescription?: string;
    description?: string;
    category?: string;
    vegType?: "veg" | "non-veg" | "egg";
    calories?: number;
    protein?: string;
    carbs?: string;
    fat?: string;
    fiber?: string;
    allergens?: string;
    spiceLevel?: "mild" | "medium" | "hot";
    imageUrl?: string;
    isAvailableForLunch?: boolean;
    isAvailableForDinner?: boolean;
    isActive?: boolean;
    sortOrder?: number;
  };

  if (!body.name || body.name.trim() === "") {
    res.status(400).json({ error: "Bad Request", message: "name is required" });
    return;
  }

  const [meal] = await db
    .insert(mealsTable)
    .values({
      id: randomUUID(),
      restaurantId,
      name: body.name.trim(),
      shortDescription: body.shortDescription?.trim() || null,
      description: body.description?.trim() || null,
      category: body.category?.trim() || null,
      vegType: body.vegType ?? "veg",
      calories: body.calories ?? null,
      protein: body.protein?.trim() || null,
      carbs: body.carbs?.trim() || null,
      fat: body.fat?.trim() || null,
      fiber: body.fiber?.trim() || null,
      allergens: body.allergens?.trim() || null,
      spiceLevel: body.spiceLevel ?? "mild",
      imageUrl: body.imageUrl?.trim() || null,
      isAvailableForLunch: body.isAvailableForLunch ?? true,
      isAvailableForDinner: body.isAvailableForDinner ?? true,
      isActive: body.isActive ?? true,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();

  res.status(201).json(toResponse(meal));
});

router.put("/:mealId", async (req, res) => {
  const restaurantId = (req.params as Record<string, string>)["restaurantId"]!;
  const mealId = (req.params as Record<string, string>)["mealId"]!;
  const body = req.body as {
    name?: string;
    shortDescription?: string;
    description?: string;
    category?: string;
    vegType?: "veg" | "non-veg" | "egg";
    calories?: number;
    protein?: string;
    carbs?: string;
    fat?: string;
    fiber?: string;
    allergens?: string;
    spiceLevel?: "mild" | "medium" | "hot";
    imageUrl?: string;
    isAvailableForLunch?: boolean;
    isAvailableForDinner?: boolean;
    isActive?: boolean;
    sortOrder?: number;
  };

  const [existing] = await db
    .select()
    .from(mealsTable)
    .where(and(eq(mealsTable.id, mealId), eq(mealsTable.restaurantId, restaurantId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Not Found", message: "Meal not found" });
    return;
  }

  const [updated] = await db
    .update(mealsTable)
    .set({
      name: body.name?.trim() ?? existing.name,
      shortDescription: body.shortDescription !== undefined ? (body.shortDescription?.trim() || null) : existing.shortDescription,
      description: body.description !== undefined ? (body.description?.trim() || null) : existing.description,
      category: body.category !== undefined ? (body.category?.trim() || null) : existing.category,
      vegType: body.vegType ?? existing.vegType,
      calories: body.calories !== undefined ? (body.calories ?? null) : existing.calories,
      protein: body.protein !== undefined ? (body.protein?.trim() || null) : existing.protein,
      carbs: body.carbs !== undefined ? (body.carbs?.trim() || null) : existing.carbs,
      fat: body.fat !== undefined ? (body.fat?.trim() || null) : existing.fat,
      fiber: body.fiber !== undefined ? (body.fiber?.trim() || null) : existing.fiber,
      allergens: body.allergens !== undefined ? (body.allergens?.trim() || null) : existing.allergens,
      spiceLevel: body.spiceLevel ?? existing.spiceLevel,
      imageUrl: body.imageUrl !== undefined ? (body.imageUrl?.trim() || null) : existing.imageUrl,
      isAvailableForLunch: body.isAvailableForLunch ?? existing.isAvailableForLunch,
      isAvailableForDinner: body.isAvailableForDinner ?? existing.isAvailableForDinner,
      isActive: body.isActive ?? existing.isActive,
      sortOrder: body.sortOrder ?? existing.sortOrder,
      updatedAt: new Date(),
    })
    .where(eq(mealsTable.id, mealId))
    .returning();

  res.json(toResponse(updated));
});

router.delete("/:mealId", async (req, res) => {
  const restaurantId = (req.params as Record<string, string>)["restaurantId"]!;
  const mealId = (req.params as Record<string, string>)["mealId"]!;

  const [existing] = await db
    .select()
    .from(mealsTable)
    .where(and(eq(mealsTable.id, mealId), eq(mealsTable.restaurantId, restaurantId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Not Found", message: "Meal not found" });
    return;
  }

  await db.delete(mealsTable).where(eq(mealsTable.id, mealId));
  res.json({ success: true });
});

export default router;
