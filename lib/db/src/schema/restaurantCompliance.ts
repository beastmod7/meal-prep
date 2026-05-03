import { pgTable, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";

export const documentStatusEnum = pgEnum("document_status", [
  "not_submitted",
  "pending_review",
  "verified",
  "rejected",
]);

export const documentTypeEnum = pgEnum("document_type", [
  "gstin_certificate",
  "pan_card",
  "fssai_licence",
  "trade_licence",
  "cancelled_cheque",
  "owner_aadhaar",
  "owner_pan",
  "incorporation_certificate",
  "utility_bill",
  "menu_card",
]);

/**
 * Stores the editable KYC text fields per restaurant.
 * One row per restaurant (upserted on save).
 */
export const restaurantComplianceTable = pgTable("restaurant_compliance", {
  id: text("id").primaryKey(),
  restaurantId: text("restaurant_id").notNull().unique(),

  // Business details
  legalName: text("legal_name"),
  tradeName: text("trade_name"),
  businessType: text("business_type"), // Proprietorship, Partnership, LLP, Pvt Ltd, Others
  gstin: text("gstin"),
  pan: text("pan"),
  fssaiLicenceNo: text("fssai_licence_no"),
  fssaiExpiry: text("fssai_expiry"), // YYYY-MM-DD
  registeredAddress: text("registered_address"),
  city: text("city"),
  state: text("state"),
  pinCode: text("pin_code"),

  // Bank details
  bankHolderName: text("bank_holder_name"),
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  accountType: text("account_type"), // Savings, Current
  ifscCode: text("ifsc_code"),
  upiId: text("upi_id"),

  // Admin-set flags (not editable by restaurant)
  bankVerified: boolean("bank_verified").notNull().default(false),
  agreementSigned: boolean("agreement_signed").notNull().default(false),
  payoutsEnabled: boolean("payouts_enabled").notNull().default(false),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Each uploaded document for a restaurant — file content is base64 text.
 * Multiple rows per document type are allowed (e.g. re-uploads after rejection).
 * Only the latest per type is surfaced to the UI.
 */
export const restaurantDocumentsTable = pgTable("restaurant_documents", {
  id: text("id").primaryKey(),
  restaurantId: text("restaurant_id").notNull(),
  documentType: documentTypeEnum("document_type").notNull(),

  // File metadata
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // MIME: image/jpeg, image/png, application/pdf
  fileSizeBytes: text("file_size_bytes"), // stored as string for JS safety
  fileContent: text("file_content").notNull(), // base64-encoded content

  // Review state (admin-controlled)
  status: documentStatusEnum("status").notNull().default("pending_review"),
  rejectionReason: text("rejection_reason"),
  reviewedAt: timestamp("reviewed_at"),
  reviewerNote: text("reviewer_note"),

  // Restaurant notes for this upload
  notes: text("notes"),

  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export type RestaurantCompliance = typeof restaurantComplianceTable.$inferSelect;
export type RestaurantDocument = typeof restaurantDocumentsTable.$inferSelect;
