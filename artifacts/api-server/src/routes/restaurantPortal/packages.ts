import { Router } from "express";
import { db } from "@workspace/db";
import { subscriptionPackagesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  requirePortalAuth,
  requireRestaurantAccess,
} from "../../middlewares/restaurantPortalAuth.js";

const router = Router({ mergeParams: true });

router.use(requirePortalAuth, requireRestaurantAccess);

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

  res.json(
    packages.map((p) => ({
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
    })),
  );
});

export default router;
