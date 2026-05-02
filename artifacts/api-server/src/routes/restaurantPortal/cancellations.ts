import { Router } from "express";
import { db } from "@workspace/db";
import { cancellationsTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import {
  requirePortalAuth,
  requireRestaurantAccess,
} from "../../middlewares/restaurantPortalAuth.js";

const router = Router({ mergeParams: true });

router.use(requirePortalAuth, requireRestaurantAccess);

router.get("/", async (req, res) => {
  const { restaurantId } = req.params;
  const { dateFrom, dateTo, mealSlot, type } = req.query as {
    dateFrom?: string;
    dateTo?: string;
    mealSlot?: string;
    type?: string;
  };

  const today = new Date().toISOString().split("T")[0]!;
  const thirtyAgo = new Date();
  thirtyAgo.setDate(thirtyAgo.getDate() - 30);
  const from = dateFrom ?? thirtyAgo.toISOString().split("T")[0]!;
  const to = dateTo ?? today;

  const conditions = [
    eq(cancellationsTable.restaurantId, restaurantId),
    gte(cancellationsTable.mealDate, from),
    lte(cancellationsTable.mealDate, to),
  ];

  const items = await db
    .select()
    .from(cancellationsTable)
    .where(and(...conditions))
    .orderBy(cancellationsTable.createdAt);

  const validTypes = ["free_cancellation", "late_cancellation", "no_show", "restaurant_cancelled"];

  const filtered =
    type && type !== "all" && validTypes.includes(type)
      ? items.filter((c) => c.cancellationType === type)
      : items;

  const validSlots = ["lunch", "dinner"];
  const slotFiltered =
    mealSlot && mealSlot !== "all" && validSlots.includes(mealSlot)
      ? filtered.filter((c) => c.mealSlot === mealSlot)
      : filtered;

  const summary = {
    freeCancellations: items.filter((c) => c.cancellationType === "free_cancellation").length,
    lateCancellations: items.filter((c) => c.cancellationType === "late_cancellation").length,
    noShows: items.filter((c) => c.cancellationType === "no_show").length,
    restaurantCancelled: items.filter((c) => c.cancellationType === "restaurant_cancelled").length,
    totalImpact: items
      .filter((c) => c.cancellationType !== "free_cancellation")
      .reduce((sum, c) => sum + parseFloat(c.deductionAmount), 0),
  };

  res.json({
    summary,
    items: slotFiltered.map((c) => ({
      id: c.id,
      studentName: c.studentName,
      packageName: c.packageName,
      mealSlot: c.mealSlot,
      mealDate: c.mealDate,
      cancellationType: c.cancellationType,
      deductionAmount: parseFloat(c.deductionAmount),
      restaurantPayout: parseFloat(c.restaurantPayout),
      timestamp: c.createdAt.toISOString(),
    })),
  });
});

export default router;
