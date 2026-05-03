import { pgTable, text, timestamp, boolean, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const restaurantsTable = pgTable("restaurants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  tagline: text("tagline"),
  description: text("description"),
  address: text("address"),
  cuisineType: text("cuisine_type"),
  campusId: text("campus_id"),
  // Display metadata
  isVeg: boolean("is_veg").notNull().default(true),
  lunchAvailable: boolean("lunch_available").notNull().default(true),
  dinnerAvailable: boolean("dinner_available").notNull().default(false),
  operatingDays: text("operating_days"), // JSON: ["Mon","Tue",...]
  maxCapacity: integer("max_capacity"),
  accentColor: text("accent_color"),
  // Pricing hints (actual prices are on packages)
  lunchStartPrice: numeric("lunch_start_price", { precision: 10, scale: 2 }),
  dinnerStartPrice: numeric("dinner_start_price", { precision: 10, scale: 2 }),
  // Cancel cutoff in hours before meal (e.g. 22 = 10 PM previous night)
  cancelCutoffHour: integer("cancel_cutoff_hour").notNull().default(22),
  // Delivery time string (e.g. "20-30 min") — free text for now
  deliveryTime: text("delivery_time"),
  // Distance shown to students — eventually computed per campus
  distanceLabel: text("distance_label"),
  // Computed and cached from restaurant_ratings on a schedule
  cachedRating: numeric("cached_rating", { precision: 3, scale: 2 }),
  cachedReviewCount: integer("cached_review_count").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRestaurantSchema = createInsertSchema(restaurantsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type Restaurant = typeof restaurantsTable.$inferSelect;
