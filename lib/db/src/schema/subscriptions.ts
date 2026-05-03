import { pgTable, text, timestamp, numeric, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";
import { restaurantsTable } from "./restaurants";
import { subscriptionPackagesTable } from "./subscriptionPackages";

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "paused",
  "cancelled",
  "completed",
  "refund_requested",
]);

/**
 * RLS template (Supabase):
 *   CREATE POLICY "subscriptions_owner" ON subscriptions
 *   USING (student_id = auth.uid());
 */
export const subscriptionsTable = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  studentId: text("student_id")
    .notNull()
    .references(() => studentsTable.id, { onDelete: "cascade" }),
  restaurantId: text("restaurant_id")
    .notNull()
    .references(() => restaurantsTable.id),
  packageId: text("package_id").references(() => subscriptionPackagesTable.id),
  // Denormalized for display without joins
  restaurantName: text("restaurant_name").notNull(),
  packageName: text("package_name").notNull(),
  mealSlot: text("meal_slot").notNull(), // lunch | dinner | both
  totalDays: integer("total_days").notNull(),
  usedDays: integer("used_days").notNull().default(0),
  remainingDays: integer("remaining_days").notNull(),
  pricePerDay: numeric("price_per_day", { precision: 10, scale: 2 }).notNull(),
  totalPaid: numeric("total_paid", { precision: 12, scale: 2 }).notNull(),
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  endDate: text("end_date").notNull(),     // YYYY-MM-DD
  status: subscriptionStatusEnum("status").notNull().default("active"),
  pausedUntil: text("paused_until"),       // YYYY-MM-DD or null
  lateCancellationFees: numeric("late_cancellation_fees", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  // Cancellation reason, stored for audit
  cancelReason: text("cancel_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptionsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptionsTable.$inferSelect;
