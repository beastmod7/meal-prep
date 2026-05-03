import { Router } from "express";
import { db } from "@workspace/db";
import {
  restaurantComplianceTable,
  restaurantDocumentsTable,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  requirePortalAuth,
  requireRestaurantAccess,
} from "../../middlewares/restaurantPortalAuth.js";

const router = Router({ mergeParams: true });
router.use(requirePortalAuth, requireRestaurantAccess);

// ─── GET /compliance ─────────────────────────────────────────────────────────
// Returns the compliance profile + the latest document per type
router.get("/", async (req, res) => {
  const restaurantId = (req.params as Record<string, string>)["restaurantId"]!;

  const [profile] = await db
    .select()
    .from(restaurantComplianceTable)
    .where(eq(restaurantComplianceTable.restaurantId, restaurantId))
    .limit(1);

  // All docs for this restaurant, newest first
  const allDocs = await db
    .select({
      id: restaurantDocumentsTable.id,
      restaurantId: restaurantDocumentsTable.restaurantId,
      documentType: restaurantDocumentsTable.documentType,
      fileName: restaurantDocumentsTable.fileName,
      fileType: restaurantDocumentsTable.fileType,
      fileSizeBytes: restaurantDocumentsTable.fileSizeBytes,
      status: restaurantDocumentsTable.status,
      rejectionReason: restaurantDocumentsTable.rejectionReason,
      reviewedAt: restaurantDocumentsTable.reviewedAt,
      notes: restaurantDocumentsTable.notes,
      uploadedAt: restaurantDocumentsTable.uploadedAt,
    })
    .from(restaurantDocumentsTable)
    .where(eq(restaurantDocumentsTable.restaurantId, restaurantId))
    .orderBy(desc(restaurantDocumentsTable.uploadedAt));

  // Keep only the latest per document type
  const seen = new Set<string>();
  const latestDocs = allDocs.filter((d) => {
    if (seen.has(d.documentType)) return false;
    seen.add(d.documentType);
    return true;
  });

  res.json({
    profile: profile ?? null,
    documents: latestDocs,
  });
});

// ─── PUT /compliance ──────────────────────────────────────────────────────────
// Upsert the compliance profile text fields
router.put("/", async (req, res) => {
  const restaurantId = (req.params as Record<string, string>)["restaurantId"]!;
  const body = req.body as {
    legalName?: string;
    tradeName?: string;
    businessType?: string;
    gstin?: string;
    pan?: string;
    fssaiLicenceNo?: string;
    fssaiExpiry?: string;
    registeredAddress?: string;
    city?: string;
    state?: string;
    pinCode?: string;
    bankHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    accountType?: string;
    ifscCode?: string;
    upiId?: string;
  };

  const [existing] = await db
    .select({ id: restaurantComplianceTable.id })
    .from(restaurantComplianceTable)
    .where(eq(restaurantComplianceTable.restaurantId, restaurantId))
    .limit(1);

  const now = new Date();
  const fields = {
    restaurantId,
    legalName: body.legalName ?? null,
    tradeName: body.tradeName ?? null,
    businessType: body.businessType ?? null,
    gstin: body.gstin ?? null,
    pan: body.pan ?? null,
    fssaiLicenceNo: body.fssaiLicenceNo ?? null,
    fssaiExpiry: body.fssaiExpiry ?? null,
    registeredAddress: body.registeredAddress ?? null,
    city: body.city ?? null,
    state: body.state ?? null,
    pinCode: body.pinCode ?? null,
    bankHolderName: body.bankHolderName ?? null,
    bankName: body.bankName ?? null,
    accountNumber: body.accountNumber ?? null,
    accountType: body.accountType ?? null,
    ifscCode: body.ifscCode ?? null,
    upiId: body.upiId ?? null,
    updatedAt: now,
  };

  if (existing) {
    const [updated] = await db
      .update(restaurantComplianceTable)
      .set(fields)
      .where(eq(restaurantComplianceTable.id, existing.id))
      .returning();
    res.json(updated);
  } else {
    const [created] = await db
      .insert(restaurantComplianceTable)
      .values({ id: randomUUID(), ...fields, createdAt: now })
      .returning();
    res.json(created);
  }
});

// ─── POST /documents ──────────────────────────────────────────────────────────
// Upload a document (base64-encoded content)
router.post("/documents", async (req, res) => {
  const restaurantId = (req.params as Record<string, string>)["restaurantId"]!;
  const { documentType, fileName, fileType, fileContent, fileSizeBytes, notes } =
    req.body as {
      documentType: string;
      fileName: string;
      fileType: string;
      fileContent: string; // base64
      fileSizeBytes?: string;
      notes?: string;
    };

  const validTypes = [
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
  ];
  if (!validTypes.includes(documentType)) {
    res.status(400).json({ error: "Bad Request", message: "Invalid document type" });
    return;
  }
  if (!fileName || !fileType || !fileContent) {
    res.status(400).json({ error: "Bad Request", message: "fileName, fileType, and fileContent are required" });
    return;
  }

  const [doc] = await db
    .insert(restaurantDocumentsTable)
    .values({
      id: randomUUID(),
      restaurantId,
      documentType: documentType as typeof restaurantDocumentsTable.$inferInsert["documentType"],
      fileName,
      fileType,
      fileContent,
      fileSizeBytes: fileSizeBytes ?? null,
      notes: notes ?? null,
      status: "pending_review",
      uploadedAt: new Date(),
    })
    .returning({
      id: restaurantDocumentsTable.id,
      restaurantId: restaurantDocumentsTable.restaurantId,
      documentType: restaurantDocumentsTable.documentType,
      fileName: restaurantDocumentsTable.fileName,
      fileType: restaurantDocumentsTable.fileType,
      fileSizeBytes: restaurantDocumentsTable.fileSizeBytes,
      status: restaurantDocumentsTable.status,
      rejectionReason: restaurantDocumentsTable.rejectionReason,
      notes: restaurantDocumentsTable.notes,
      uploadedAt: restaurantDocumentsTable.uploadedAt,
    });

  res.status(201).json(doc);
});

// ─── GET /documents/:docId ────────────────────────────────────────────────────
// Download a document (returns base64 content for display)
router.get("/documents/:docId", async (req, res) => {
  const restaurantId = (req.params as Record<string, string>)["restaurantId"]!;
  const docId = (req.params as Record<string, string>)["docId"]!;

  const [doc] = await db
    .select()
    .from(restaurantDocumentsTable)
    .where(
      and(
        eq(restaurantDocumentsTable.id, docId),
        eq(restaurantDocumentsTable.restaurantId, restaurantId),
      ),
    )
    .limit(1);

  if (!doc) {
    res.status(404).json({ error: "Not Found", message: "Document not found" });
    return;
  }

  res.json({
    id: doc.id,
    documentType: doc.documentType,
    fileName: doc.fileName,
    fileType: doc.fileType,
    fileSizeBytes: doc.fileSizeBytes,
    fileContent: doc.fileContent,
    status: doc.status,
    notes: doc.notes,
    uploadedAt: doc.uploadedAt,
  });
});

// ─── DELETE /documents/:docId ─────────────────────────────────────────────────
router.delete("/documents/:docId", async (req, res) => {
  const restaurantId = (req.params as Record<string, string>)["restaurantId"]!;
  const docId = (req.params as Record<string, string>)["docId"]!;

  const [deleted] = await db
    .delete(restaurantDocumentsTable)
    .where(
      and(
        eq(restaurantDocumentsTable.id, docId),
        eq(restaurantDocumentsTable.restaurantId, restaurantId),
      ),
    )
    .returning({ id: restaurantDocumentsTable.id });

  if (!deleted) {
    res.status(404).json({ error: "Not Found", message: "Document not found" });
    return;
  }

  res.json({ success: true });
});

export default router;
