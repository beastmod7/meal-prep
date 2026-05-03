import { Router } from "express";
import { db } from "@workspace/db";
import {
  mealOrdersTable,
  cancellationsTable,
  settlementPeriodsTable,
  subscriptionPackagesTable,
} from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import {
  requirePortalAuth,
  requireRestaurantAccess,
} from "../../middlewares/restaurantPortalAuth.js";

const router = Router({ mergeParams: true });

router.use(requirePortalAuth, requireRestaurantAccess);

router.get("/export", async (req, res) => {
  const restaurantId = (req.params as Record<string, string>)["restaurantId"]!;
  const { reportType, dateFrom, dateTo, mealSlot } = req.query as {
    reportType: string;
    dateFrom?: string;
    dateTo?: string;
    mealSlot?: string;
  };

  const today = new Date().toISOString().split("T")[0]!;
  const thirtyAgo = new Date();
  thirtyAgo.setDate(thirtyAgo.getDate() - 30);
  const from = dateFrom ?? thirtyAgo.toISOString().split("T")[0]!;
  const to = dateTo ?? today;

  let headers: string[] = [];
  let rows: string[][] = [];

  switch (reportType) {
    case "daily_prep": {
      headers = ["Date", "Meal Slot", "Student Name", "Package", "Status", "Price/Day"];
      const orders = await db
        .select()
        .from(mealOrdersTable)
        .where(
          and(
            eq(mealOrdersTable.restaurantId, restaurantId),
            gte(mealOrdersTable.scheduledDate, from),
            lte(mealOrdersTable.scheduledDate, to),
          ),
        )
        .orderBy(mealOrdersTable.scheduledDate, mealOrdersTable.mealSlot);

      const slotFiltered = mealSlot && mealSlot !== "all"
        ? orders.filter((o) => o.mealSlot === mealSlot)
        : orders;

      rows = slotFiltered.map((o) => [
        o.scheduledDate,
        o.mealSlot,
        o.studentName,
        o.packageName,
        o.status,
        `₹${o.pricePerDay}`,
      ]);
      break;
    }
    case "weekly_settlement": {
      headers = ["Period", "Meals Delivered", "Gross Value", "Commission", "Net Payable", "Status", "Payout Date"];
      const periods = await db
        .select()
        .from(settlementPeriodsTable)
        .where(
          and(
            eq(settlementPeriodsTable.restaurantId, restaurantId),
            gte(settlementPeriodsTable.periodStart, from),
            lte(settlementPeriodsTable.periodEnd, to),
          ),
        )
        .orderBy(settlementPeriodsTable.periodStart);

      rows = periods.map((p) => [
        `${p.periodStart} to ${p.periodEnd}`,
        String(p.mealsDelivered),
        `₹${p.grossValue}`,
        `₹${((parseFloat(p.grossValue) * parseFloat(p.commissionRate)) / 100).toFixed(2)}`,
        `₹${p.netPayable}`,
        p.status,
        p.payoutDate ?? "—",
      ]);
      break;
    }
    case "cancellations": {
      headers = ["Date", "Student", "Package", "Slot", "Type", "Deduction", "Restaurant Payout"];
      const cancels = await db
        .select()
        .from(cancellationsTable)
        .where(
          and(
            eq(cancellationsTable.restaurantId, restaurantId),
            gte(cancellationsTable.mealDate, from),
            lte(cancellationsTable.mealDate, to),
          ),
        )
        .orderBy(cancellationsTable.mealDate);

      rows = cancels.map((c) => [
        c.mealDate,
        c.studentName,
        c.packageName,
        c.mealSlot,
        c.cancellationType.replace(/_/g, " "),
        `₹${c.deductionAmount}`,
        `₹${c.restaurantPayout}`,
      ]);
      break;
    }
    case "package_performance": {
      headers = ["Package Name", "Meal Slot", "Validity", "Price/Day", "Active Subscribers", "Total Sold", "Revenue", "Status"];
      const packages = await db
        .select()
        .from(subscriptionPackagesTable)
        .where(eq(subscriptionPackagesTable.restaurantId, restaurantId))
        .orderBy(subscriptionPackagesTable.status);

      rows = packages.map((p) => [
        p.name,
        p.mealSlot,
        `${p.validityDays} days`,
        `₹${p.pricePerDay}`,
        String(p.activeSubscribers),
        String(p.totalSold),
        `₹${p.revenueGenerated}`,
        p.status,
      ]);
      break;
    }
    default:
      headers = ["No data"];
      rows = [["Report type not recognized"]];
  }

  res.json({
    reportType,
    generatedAt: new Date().toISOString(),
    dateRange: { from, to },
    headers,
    rows,
    totalRows: rows.length,
  });
});

export default router;
