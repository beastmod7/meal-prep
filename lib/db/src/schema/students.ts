import { pgTable, text, timestamp, pgEnum, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { campusesTable } from "./campuses";

export const foodPreferenceEnum = pgEnum("food_preference", [
  "veg",
  "non-veg",
  "egg",
  "jain",
]);

/**
 * NOTE — Supabase migration:
 * When migrating to Supabase, `id` becomes the Supabase auth.users UUID.
 * The phone OTP flow (POST /student/auth/send-otp + verify-otp) is replaced
 * entirely by `supabase.auth.signInWithOtp({ phone })` on the mobile client.
 * No schema changes are needed — only the auth routes are swapped out.
 *
 * RLS template:
 *   CREATE POLICY "students_own_data" ON students
 *   USING (id = auth.uid());
 */
export const studentsTable = pgTable("students", {
  id: text("id").primaryKey(), // UUID = future Supabase auth.users.id
  phone: text("phone").notNull().unique(),
  name: text("name").notNull(),
  campusId: text("campus_id").references(() => campusesTable.id),
  campusName: text("campus_name"),
  foodPreference: foodPreferenceEnum("food_preference").notNull().default("veg"),
  address: text("address"),
  // Wallet balance in paise (integer) is safer; stored as numeric here for clarity
  walletBalance: numeric("wallet_balance", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStudentSchema = createInsertSchema(studentsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof studentsTable.$inferSelect;
