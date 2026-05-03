import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const campusesTable = pgTable("campuses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  area: text("area"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCampusSchema = createInsertSchema(campusesTable).omit({ createdAt: true });
export type InsertCampus = z.infer<typeof insertCampusSchema>;
export type Campus = typeof campusesTable.$inferSelect;
