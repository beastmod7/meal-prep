import { pgTable, text, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { restaurantsTable } from "./restaurants";

export const cancellationTypeEnum = pgEnum("cancellation_type", [
  "free_cancellation",
  "late_cancellation",
  "no_show",
  "restaurant_cancelled",
]);

export const cancellationsTable = pgTable("cancellations", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  restaurantId: text("restaurant_id")
    .notNull()
    .references(() => restaurantsTable.id, { onDelete: "cascade" }),
  studentName: text("student_name").notNull(),
  packageName: text("package_name").notNull(),
  mealSlot: text("meal_slot").notNull(),
  mealDate: text("meal_date").notNull(),
  cancellationType: cancellationTypeEnum("cancellation_type").notNull(),
  deductionAmount: numeric("deduction_amount", {
    precision: 10,
    scale: 2,
  }).notNull(),
  restaurantPayout: numeric("restaurant_payout", {
    precision: 10,
    scale: 2,
  }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCancellationSchema = createInsertSchema(
  cancellationsTable,
).omit({ createdAt: true });
export type InsertCancellation = z.infer<typeof insertCancellationSchema>;
export type Cancellation = typeof cancellationsTable.$inferSelect;
