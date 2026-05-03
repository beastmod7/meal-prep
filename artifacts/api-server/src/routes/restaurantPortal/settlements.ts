import { Router } from "express";
import { db } from "@workspace/db";
import { settlementPeriodsTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import {
  requirePortalAuth,
  requireRestaurantAccess,
} from "../../middlewares/restaurantPortalAuth.js";

const router = Router({ mergeParams: true });

router.use(requirePortalAuth, requireRestaurantAccess);

router.get("/", async (req, res) => {
  const restaurantId = (req.params as Record<string, string>)["restaurantId"]!;
  const { dateFrom, dateTo, status } = req.query as {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  };

  const today = new Date().toISOString().split("T")[0]!;
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const from = dateFrom ?? sixMonthsAgo.toISOString().split("T")[0]!;
  const to = dateTo ?? today;

  const conditions = [
    eq(settlementPeriodsTable.restaurantId, restaurantId),
    gte(settlementPeriodsTable.periodStart, from),
    lte(settlementPeriodsTable.periodEnd, to),
  ];

  const periods = await db
    .select()
    .from(settlementPeriodsTable)
    .where(and(...conditions))
    .orderBy(settlementPeriodsTable.periodStart);

  const validStatuses = ["pending", "payable", "processing", "paid", "on_hold"];
  const filtered =
    status && status !== "all" && validStatuses.includes(status)
      ? periods.filter((p) => p.status === status)
      : periods;

  const grossDeliveredValue = periods.reduce((sum, p) => sum + parseFloat(p.grossValue), 0);
  const platformCommission = periods.reduce(
    (sum, p) => sum + (parseFloat(p.grossValue) * parseFloat(p.commissionRate)) / 100,
    0,
  );
  const netPayable = periods.reduce((sum, p) => sum + parseFloat(p.netPayable), 0);
  const paidAmount = periods
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + parseFloat(p.netPayable), 0);
  const pendingAmount = periods
    .filter((p) => p.status !== "paid")
    .reduce((sum, p) => sum + parseFloat(p.netPayable), 0);

  res.json({
    summary: {
      grossDeliveredValue,
      lateCancellationShare: grossDeliveredValue * 0.02,
      noShowValue: grossDeliveredValue * 0.01,
      restaurantCancellationDeductions: grossDeliveredValue * 0.005,
      platformCommission,
      netPayable,
      pendingAmount,
      paidAmount,
    },
    periods: filtered.map((p) => ({
      id: p.id,
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      grossValue: parseFloat(p.grossValue),
      commission: (parseFloat(p.grossValue) * parseFloat(p.commissionRate)) / 100,
      netPayable: parseFloat(p.netPayable),
      status: p.status,
      payoutDate: p.payoutDate ?? undefined,
      mealsDelivered: p.mealsDelivered,
    })),
  });
});

export default router;
