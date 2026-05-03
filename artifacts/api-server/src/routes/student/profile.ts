import { Router } from "express";
import { db } from "@workspace/db";
import { studentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireStudentAuth } from "../../middlewares/studentAuth.js";

const router = Router();
router.use(requireStudentAuth);

function formatStudent(s: typeof studentsTable.$inferSelect) {
  return {
    id: s.id,
    phone: s.phone,
    name: s.name,
    campusId: s.campusId,
    campusName: s.campusName,
    foodPreference: s.foodPreference,
    address: s.address,
    walletBalance: parseFloat(s.walletBalance ?? "0"),
    isProfileComplete: s.name !== "Student" && !!s.campusId,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, req.student!.studentId))
    .limit(1);

  if (!student) {
    res.status(404).json({ error: "Not Found", message: "Student not found" });
    return;
  }

  res.json(formatStudent(student));
});

router.put("/", async (req, res) => {
  const { name, campusId, campusName, foodPreference, address } = req.body as {
    name?: string;
    campusId?: string;
    campusName?: string;
    foodPreference?: "veg" | "non-veg" | "egg" | "jain";
    address?: string;
  };

  const updates: Partial<typeof studentsTable.$inferInsert> = {};
  if (name !== undefined) updates.name = name;
  if (campusId !== undefined) updates.campusId = campusId;
  if (campusName !== undefined) updates.campusName = campusName;
  if (foodPreference !== undefined) updates.foodPreference = foodPreference;
  if (address !== undefined) updates.address = address;
  updates.updatedAt = new Date();

  const [updated] = await db
    .update(studentsTable)
    .set(updates)
    .where(eq(studentsTable.id, req.student!.studentId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Not Found", message: "Student not found" });
    return;
  }

  res.json(formatStudent(updated));
});

export default router;
