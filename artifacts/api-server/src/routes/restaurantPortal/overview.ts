import { Router } from "express";
import { db } from "@workspace/db";
import {
  restaurantsTable,
  subscriptionPackagesTable,
  mealOrdersTable,
  cancellationsTable,
  settlementPeriodsTable,
} from "@workspace/db";
import { eq, and, gte, lte, sql, count } from "drizzle-orm";
import {
  requirePortalAuth,
  requireRestaurantAccess,
} from "../../middlewares/restaurantPortalAuth.js";

const router = Router({ mergeParams: true });

router.use(requirePortalAuth, requireRestaurantAccess);

router.get("/", async (req, res) => {
  const { restaurantId } = req.params;

  const [restaurant] = await db
    .select()
    .from(restaurantsTable)
    .where(eq(restaurantsTable.id, restaurantId))
    .limit(1);

  if (!restaurant) {
    res.status(404).json({ error: "Not Found", message: "Restaurant not found" });
    return;
  }

  const today = new Date().toISOString().split("T")[0]!;

  const [packagesCount] = await db
    .select({ count: count() })
    .from(subscriptionPackagesTable)
    .where(
      and(
        eq(subscriptionPackagesTable.restaurantId, restaurantId),
        eq(subscriptionPackagesTable.status, "active"),
      ),
    );

  const [totalSubscribers] = await db
    .select({ total: sql<number>`sum(${subscriptionPackagesTable.activeSubscribers})` })
    .from(subscriptionPackagesTable)
    .where(
      and(
        eq(subscriptionPackagesTable.restaurantId, restaurantId),
        eq(subscriptionPackagesTable.status, "active"),
      ),
    );

  const todayOrders = await db
    .select()
    .from(mealOrdersTable)
    .where(
      and(
        eq(mealOrdersTable.restaurantId, restaurantId),
        eq(mealOrdersTable.scheduledDate, today),
      ),
    );

  const mealsScheduledToday = todayOrders.filter((o) => o.status !== "cancelled").length;
  const mealsLockedForPrep = todayOrders.filter((o) => o.isLocked && o.status !== "cancelled" && o.status !== "no_show").length;
  const mealsDeliveredToday = todayOrders.filter((o) => o.status === "delivered").length;
  const lunchScheduledToday = todayOrders.filter((o) => o.mealSlot === "lunch" && o.status !== "cancelled").length;
  const dinnerScheduledToday = todayOrders.filter((o) => o.mealSlot === "dinner" && o.status !== "cancelled").length;
  const lunchLockedCount = todayOrders.filter((o) => o.mealSlot === "lunch" && o.isLocked && o.status !== "cancelled").length;
  const dinnerLockedCount = todayOrders.filter((o) => o.mealSlot === "dinner" && o.isLocked && o.status !== "cancelled").length;

  const last30days = new Date();
  last30days.setDate(last30days.getDate() - 30);
  const last30 = last30days.toISOString().split("T")[0]!;

  const recentCancellations = await db
    .select()
    .from(cancellationsTable)
    .where(
      and(
        eq(cancellationsTable.restaurantId, restaurantId),
        gte(cancellationsTable.mealDate, last30),
      ),
    );

  const freeCancellations = recentCancellations.filter((c) => c.cancellationType === "free_cancellation").length;
  const lateCancellations = recentCancellations.filter((c) => c.cancellationType === "late_cancellation").length;
  const noShows = recentCancellations.filter((c) => c.cancellationType === "no_show").length;

  const pendingSettlements = await db
    .select()
    .from(settlementPeriodsTable)
    .where(
      and(
        eq(settlementPeriodsTable.restaurantId, restaurantId),
        eq(settlementPeriodsTable.status, "payable"),
      ),
    );

  const pendingSettlementAmount = pendingSettlements.reduce(
    (sum, s) => sum + parseFloat(s.netPayable),
    0,
  );

  const recentCancellationItems = recentCancellations.slice(0, 3).map((c) => ({
    type: "cancellation",
    description: `${c.cancellationType.replace(/_/g, " ")} — ${c.studentName}`,
    timestamp: c.createdAt.toISOString(),
    amount: parseFloat(c.deductionAmount),
  }));

  res.json({
    restaurantId,
    restaurantName: restaurant.name,
    dateRange: { from: last30, to: today },
    activePackages: packagesCount?.count ?? 0,
    activeSubscribers: totalSubscribers?.total ?? 0,
    mealsScheduledToday,
    mealsLockedForPrep,
    mealsDeliveredToday,
    freeCancellations,
    lateCancellations,
    noShows,
    estimatedPayoutPeriod: 7,
    pendingSettlementAmount,
    lunchScheduledToday,
    dinnerScheduledToday,
    lunchLockedCount,
    dinnerLockedCount,
    recentActivity: recentCancellationItems,
  });
});

export default router;
