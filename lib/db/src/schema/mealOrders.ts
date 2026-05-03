import {
  pgTable,
  text,
  timestamp,
  numeric,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { restaurantsTable } from "./restaurants";

export const mealOrdersTable = pgTable(
  "meal_orders",
  {
    id: text("id").primaryKey(),
    restaurantId: text("restaurant_id")
      .notNull()
      .references(() => restaurantsTable.id, { onDelete: "cascade" }),
    studentId: text("student_id"),
    subscriptionId: text("subscription_id").notNull(),
    packageId: text("package_id").notNull(),
    packageName: text("package_name").notNull(),
    studentName: text("student_name").notNull(),
    studentPhoneMasked: text("student_phone_masked").notNull(),
    mealSlot: text("meal_slot").notNull(),
    scheduledDate: text("scheduled_date").notNull(),
    status: text("status").notNull().default("scheduled"),
    pricePerDay: numeric("price_per_day", { precision: 10, scale: 2 }).notNull(),
    freeCancelUntil: text("free_cancel_until").notNull(),
    isLocked: boolean("is_locked").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("meal_orders_student_date_idx").on(t.studentId, t.scheduledDate),
    index("meal_orders_restaurant_date_idx").on(t.restaurantId, t.scheduledDate),
    index("meal_orders_subscription_idx").on(t.subscriptionId),
    index("meal_orders_status_idx").on(t.status),
  ],
);

export const insertMealOrderSchema = createInsertSchema(mealOrdersTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertMealOrder = z.infer<typeof insertMealOrderSchema>;
export type MealOrder = typeof mealOrdersTable.$inferSelect;
