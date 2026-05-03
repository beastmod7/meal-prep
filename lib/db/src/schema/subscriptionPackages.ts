import {
  pgTable,
  text,
  timestamp,
  numeric,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { restaurantsTable } from "./restaurants";

export const packageSlotEnum = pgEnum("package_slot", [
  "lunch",
  "dinner",
  "both",
]);
export const packageStatusEnum = pgEnum("package_status", [
  "active",
  "paused",
  "archived",
]);

export const subscriptionPackagesTable = pgTable("subscription_packages", {
  id: text("id").primaryKey(),
  restaurantId: text("restaurant_id")
    .notNull()
    .references(() => restaurantsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  mealSlot: packageSlotEnum("meal_slot").notNull(),
  validityDays: integer("validity_days").notNull(),
  pricePerDay: numeric("price_per_day", { precision: 10, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  discountPct: numeric("discount_pct", { precision: 5, scale: 2 }).default("0"),
  activeSubscribers: integer("active_subscribers").notNull().default(0),
  totalSold: integer("total_sold").notNull().default(0),
  revenueGenerated: numeric("revenue_generated", {
    precision: 12,
    scale: 2,
  }).notNull().default("0"),
  status: packageStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSubscriptionPackageSchema = createInsertSchema(
  subscriptionPackagesTable,
).omit({ createdAt: true, updatedAt: true });
export type InsertSubscriptionPackage = z.infer<
  typeof insertSubscriptionPackageSchema
>;
export type SubscriptionPackage =
  typeof subscriptionPackagesTable.$inferSelect;
