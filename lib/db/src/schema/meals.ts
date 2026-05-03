import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { restaurantsTable } from "./restaurants";

export const vegTypeEnum = pgEnum("veg_type", ["veg", "non-veg", "egg"]);
export const spiceLevelEnum = pgEnum("spice_level", ["mild", "medium", "hot"]);

export const mealsTable = pgTable("meals", {
  id: text("id").primaryKey(),
  restaurantId: text("restaurant_id")
    .notNull()
    .references(() => restaurantsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  shortDescription: text("short_description"),
  description: text("description"),
  category: text("category"),
  vegType: vegTypeEnum("veg_type").notNull().default("veg"),
  calories: integer("calories"),
  protein: text("protein"),
  carbs: text("carbs"),
  fat: text("fat"),
  fiber: text("fiber"),
  allergens: text("allergens"),
  spiceLevel: spiceLevelEnum("spice_level").default("mild"),
  imageUrl: text("image_url"),
  isAvailableForLunch: boolean("is_available_for_lunch").notNull().default(true),
  isAvailableForDinner: boolean("is_available_for_dinner").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMealSchema = createInsertSchema(mealsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertMeal = z.infer<typeof insertMealSchema>;
export type Meal = typeof mealsTable.$inferSelect;
