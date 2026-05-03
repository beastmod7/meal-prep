import { Router } from "express";
import { db } from "@workspace/db";
import { subscriptionPackagesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  requirePortalAuth,
  requireRestaurantAccess,
} from "../../middlewares/restaurantPortalAuth.js";
import { randomUUID } from "crypto";

const router = Router({ mergeParams: true });

router.use(requirePortalAuth, requireRestaurantAccess);

const toResponse = (p: typeof subscriptionPackagesTable.$inferSelect) => ({
  id: p.id,
  name: p.name,
  mealSlot: p.mealSlot,
  mealCount: p.validityDays,
  pricePerDay: parseFloat(p.pricePerDay),
  totalPrice: parseFloat(p.totalPrice),
  validityDays: p.validityDays,
  activeSubscribers: p.activeSubscribers,
  totalSold: p.totalSold,
  revenueGenerated: parseFloat(p.revenueGenerated),
  status: p.status,
  discountPct: p.discountPct ? parseFloat(p.discountPct) : 0,
});

router.get("/", async (req, res) => {
  const { restaurantId } = req.params;
  const { status } = req.query as { status?: string };

  const conditions = [eq(subscriptionPackagesTable.restaurantId, restaurantId)];
  if (status && status !== "all") {
    const validStatuses = ["active", "paused", "archived"] as const;
    if (validStatuses.includes(status as (typeof validStatuses)[number])) {
      conditions.push(
        eq(
          subscriptionPackagesTable.status,
          status as (typeof validStatuses)[number],
        ),
      );
    }
  }

  const packages = await db
    .select()
    .from(subscriptionPackagesTable)
    .where(and(...conditions))
    .orderBy(subscriptionPackagesTable.createdAt);

  res.json(packages.map(toResponse));
});

router.post("/", async (req, res) => {
  const { restaurantId } = req.params;
  const body = req.body as {
    name: string;
    mealSlot: "lunch" | "dinner" | "both";
    validityDays: number;
    pricePerDay: number;
    discountPct?: number;
    description?: string;
    status?: "active" | "paused" | "archived";
  };

  if (!body.name || !body.mealSlot || !body.validityDays || body.pricePerDay === undefined) {
    res.status(400).json({ error: "Bad Request", message: "name, mealSlot, validityDays, and pricePerDay are required" });
    return;
  }

  const discount = body.discountPct ?? 0;
  const pricePerDay = body.pricePerDay;
  const totalBeforeDiscount = pricePerDay * body.validityDays;
  const totalPrice = totalBeforeDiscount * (1 - discount / 100);

  const [pkg] = await db
    .insert(subscriptionPackagesTable)
    .values({
      id: randomUUID(),
      restaurantId,
      name: body.name.trim(),
      mealSlot: body.mealSlot,
      validityDays: body.validityDays,
      pricePerDay: pricePerDay.toFixed(2),
      totalPrice: totalPrice.toFixed(2),
      discountPct: discount.toFixed(2),
      status: body.status ?? "active",
    })
    .returning();

  res.status(201).json(toResponse(pkg));
});

router.put("/:packageId", async (req, res) => {
  const { restaurantId, packageId } = req.params;
  const body = req.body as {
    name?: string;
    mealSlot?: "lunch" | "dinner" | "both";
    validityDays?: number;
    pricePerDay?: number;
    discountPct?: number;
    description?: string;
    status?: "active" | "paused" | "archived";
  };

  const [existing] = await db
    .select()
    .from(subscriptionPackagesTable)
    .where(and(eq(subscriptionPackagesTable.id, packageId), eq(subscriptionPackagesTable.restaurantId, restaurantId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Not Found", message: "Package not found" });
    return;
  }

  const validityDays = body.validityDays ?? existing.validityDays;
  const pricePerDay = body.pricePerDay ?? parseFloat(existing.pricePerDay);
  const discount = body.discountPct !== undefined ? body.discountPct : (existing.discountPct ? parseFloat(existing.discountPct) : 0);
  const totalPrice = pricePerDay * validityDays * (1 - discount / 100);

  const [updated] = await db
    .update(subscriptionPackagesTable)
    .set({
      name: body.name?.trim() ?? existing.name,
      mealSlot: body.mealSlot ?? existing.mealSlot,
      validityDays,
      pricePerDay: pricePerDay.toFixed(2),
      totalPrice: totalPrice.toFixed(2),
      discountPct: discount.toFixed(2),
      status: body.status ?? existing.status,
      updatedAt: new Date(),
    })
    .where(eq(subscriptionPackagesTable.id, packageId))
    .returning();

  res.json(toResponse(updated));
});

router.delete("/:packageId", async (req, res) => {
  const { restaurantId, packageId } = req.params;

  const [existing] = await db
    .select()
    .from(subscriptionPackagesTable)
    .where(and(eq(subscriptionPackagesTable.id, packageId), eq(subscriptionPackagesTable.restaurantId, restaurantId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Not Found", message: "Package not found" });
    return;
  }

  const [updated] = await db
    .update(subscriptionPackagesTable)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(subscriptionPackagesTable.id, packageId))
    .returning();

  res.json({ success: true });
});

export default router;
