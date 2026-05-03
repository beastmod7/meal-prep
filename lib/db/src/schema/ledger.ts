import { pgTable, text, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";

export const ledgerEntryTypeEnum = pgEnum("ledger_entry_type", [
  "subscription_purchase",
  "meal_used",
  "free_cancel",
  "late_cancel",
  "full_charge",
  "refund",
  "wallet_topup",
  "subscription_cancel_refund",
]);

/**
 * RLS template (Supabase):
 *   CREATE POLICY "ledger_owner" ON ledger_entries
 *   FOR SELECT USING (student_id = auth.uid());
 */
export const ledgerEntriesTable = pgTable("ledger_entries", {
  id: text("id").primaryKey(),
  studentId: text("student_id")
    .notNull()
    .references(() => studentsTable.id, { onDelete: "cascade" }),
  subscriptionId: text("subscription_id"),
  restaurantName: text("restaurant_name"),
  type: ledgerEntryTypeEnum("type").notNull(),
  description: text("description").notNull(),
  // Negative = debit, positive = credit
  amountDelta: numeric("amount_delta", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLedgerEntrySchema = createInsertSchema(ledgerEntriesTable).omit({
  createdAt: true,
});
export type InsertLedgerEntry = z.infer<typeof insertLedgerEntrySchema>;
export type LedgerEntry = typeof ledgerEntriesTable.$inferSelect;
