import {
  pgTable,
  text,
  timestamp,
  numeric,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { restaurantsTable } from "./restaurants";

export const mealSlotEnum = pgEnum("meal_slot", ["lunch", "dinner"]);
export const mealOrderStatusEnum = pgEnum("meal_order_status", [
  "scheduled",
  "locked",
  "accepted",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
  "no_show",
]);

export const mealOrdersTable = pgTable("meal_orders", {
  id: text("id").primaryKey(),
  restaurantId: text("restaurant_id")
    .notNull()
    .references(() => restaurantsTable.id, { onDelete: "cascade" }),
  subscriptionId: text("subscription_id").notNull(),
  packageId: text("package_id").notNull(),
  packageName: text("package_name").notNull(),
  studentName: text("student_name").notNull(),
  studentPhoneMasked: text("student_phone_masked").notNull(),
  mealSlot: mealSlotEnum("meal_slot").notNull(),
  scheduledDate: text("scheduled_date").notNull(),
  status: mealOrderStatusEnum("status").notNull().default("scheduled"),
  pricePerDay: numeric("price_per_day", { precision: 10, scale: 2 }).notNull(),
  freeCancelUntil: text("free_cancel_until").notNull(),
  isLocked: boolean("is_locked").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMealOrderSchema = createInsertSchema(mealOrdersTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertMealOrder = z.infer<typeof insertMealOrderSchema>;
export type MealOrder = typeof mealOrdersTable.$inferSelect;
