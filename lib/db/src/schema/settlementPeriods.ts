import { pgTable, text, timestamp, numeric, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { restaurantsTable } from "./restaurants";

export const settlementStatusEnum = pgEnum("settlement_status", [
  "pending",
  "payable",
  "processing",
  "paid",
  "on_hold",
]);

export const settlementPeriodsTable = pgTable("settlement_periods", {
  id: text("id").primaryKey(),
  restaurantId: text("restaurant_id")
    .notNull()
    .references(() => restaurantsTable.id, { onDelete: "cascade" }),
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  grossValue: numeric("gross_value", { precision: 10, scale: 2 }).notNull(),
  commissionRate: numeric("commission_rate", {
    precision: 5,
    scale: 2,
  }).notNull(),
  netPayable: numeric("net_payable", { precision: 10, scale: 2 }).notNull(),
  status: settlementStatusEnum("status").notNull().default("pending"),
  payoutDate: text("payout_date"),
  mealsDelivered: integer("meals_delivered").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSettlementPeriodSchema = createInsertSchema(
  settlementPeriodsTable,
).omit({ createdAt: true });
export type InsertSettlementPeriod = z.infer<typeof insertSettlementPeriodSchema>;
export type SettlementPeriod = typeof settlementPeriodsTable.$inferSelect;
