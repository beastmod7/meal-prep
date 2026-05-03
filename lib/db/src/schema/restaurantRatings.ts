import { pgTable, text, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";
import { restaurantsTable } from "./restaurants";

/**
 * RLS template (Supabase):
 *   CREATE POLICY "ratings_owner_insert" ON restaurant_ratings
 *   FOR INSERT WITH CHECK (student_id = auth.uid());
 *   CREATE POLICY "ratings_read" ON restaurant_ratings
 *   FOR SELECT USING (true); -- public readable for aggregates
 */
export const restaurantRatingsTable = pgTable("restaurant_ratings", {
  id: text("id").primaryKey(),
  studentId: text("student_id")
    .notNull()
    .references(() => studentsTable.id, { onDelete: "cascade" }),
  restaurantId: text("restaurant_id")
    .notNull()
    .references(() => restaurantsTable.id, { onDelete: "cascade" }),
  foodQuality: numeric("food_quality", { precision: 3, scale: 1 }).notNull(),
  packaging: numeric("packaging", { precision: 3, scale: 1 }).notNull(),
  delivery: numeric("delivery", { precision: 3, scale: 1 }).notNull(),
  valueForMoney: numeric("value_for_money", { precision: 3, scale: 1 }).notNull(),
  hygiene: numeric("hygiene", { precision: 3, scale: 1 }).notNull(),
  communication: numeric("communication", { precision: 3, scale: 1 }).notNull(),
  overall: numeric("overall", { precision: 3, scale: 1 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRestaurantRatingSchema = createInsertSchema(restaurantRatingsTable).omit({
  createdAt: true,
});
export type InsertRestaurantRating = z.infer<typeof insertRestaurantRatingSchema>;
export type RestaurantRating = typeof restaurantRatingsTable.$inferSelect;
