import { Router } from "express";
import { db } from "@workspace/db";
import { ledgerEntriesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireStudentAuth } from "../../middlewares/studentAuth.js";

const router = Router();
router.use(requireStudentAuth);

router.get("/", async (req, res) => {
  const entries = await db
    .select()
    .from(ledgerEntriesTable)
    .where(eq(ledgerEntriesTable.studentId, req.student!.studentId))
    .orderBy(desc(ledgerEntriesTable.createdAt))
    .limit(100);

  res.json(
    entries.map((e) => ({
      id: e.id,
      subscriptionId: e.subscriptionId,
      restaurantName: e.restaurantName,
      type: e.type,
      description: e.description,
      amountDelta: parseFloat(e.amountDelta),
      createdAt: e.createdAt.toISOString(),
    })),
  );
});

export default router;
