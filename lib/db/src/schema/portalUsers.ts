import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const portalUserRoleEnum = pgEnum("portal_user_role", [
  "restaurant_owner",
  "restaurant_staff",
  "admin",
  "super_admin",
]);

export const portalUsersTable = pgTable("portal_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: portalUserRoleEnum("role").notNull().default("restaurant_owner"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPortalUserSchema = createInsertSchema(portalUsersTable).omit(
  { createdAt: true, updatedAt: true },
);
export type InsertPortalUser = z.infer<typeof insertPortalUserSchema>;
export type PortalUser = typeof portalUsersTable.$inferSelect;
