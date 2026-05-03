import { Router } from "express";
import { db } from "@workspace/db";
import { studentsTable, campusesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signStudentToken } from "../../middlewares/studentAuth.js";
import { randomUUID } from "crypto";

const router = Router();

/**
 * POST /api/student/auth/send-otp
 *
 * Dev-mode stub: always accepts any phone number and "sends" OTP 123456.
 *
 * Supabase migration:
 *   DELETE this route entirely. The mobile client calls:
 *   supabase.auth.signInWithOtp({ phone: '+91XXXXXXXXXX' })
 *   Supabase handles OTP delivery via Twilio/MessageBird.
 */
router.post("/send-otp", async (req, res) => {
  const { phone } = req.body as { phone?: string };

  if (!phone || !/^\+?[0-9]{10,13}$/.test(phone.replace(/\s/g, ""))) {
    res.status(400).json({ error: "Bad Request", message: "Invalid phone number" });
    return;
  }

  // In production this would send an SMS via Twilio / Supabase Auth.
  // In dev, OTP is always 123456.
  req.log.info({ phone }, "OTP send requested (dev stub)");
  res.json({ message: "OTP sent", devNote: "Use OTP 123456 in development" });
});

/**
 * POST /api/student/auth/verify-otp
 *
 * Dev-mode stub: accepts phone + otp=123456, upserts student, returns JWT.
 *
 * Supabase migration:
 *   DELETE this route. The mobile client calls:
 *   supabase.auth.verifyOtp({ phone, token, type: 'sms' })
 *   The returned Supabase JWT is passed as Bearer token to all /api/student/* routes.
 *   Replace requireStudentAuth middleware to verify Supabase JWT instead.
 */
router.post("/verify-otp", async (req, res) => {
  const { phone, otp } = req.body as { phone?: string; otp?: string };

  if (!phone || !otp) {
    res.status(400).json({ error: "Bad Request", message: "phone and otp required" });
    return;
  }

  if (otp !== "123456") {
    res.status(401).json({ error: "Unauthorized", message: "Invalid OTP" });
    return;
  }

  const normalised = phone.replace(/\s/g, "");

  // Upsert: create student if first login
  let [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.phone, normalised))
    .limit(1);

  if (!student) {
    const [created] = await db
      .insert(studentsTable)
      .values({
        id: randomUUID(),
        phone: normalised,
        name: "Student",
        foodPreference: "veg",
      })
      .returning();
    student = created!;
  }

  const token = signStudentToken({
    studentId: student.id,
    phone: student.phone,
    name: student.name,
  });

  res.json({
    token,
    student: {
      id: student.id,
      phone: student.phone,
      name: student.name,
      campusId: student.campusId,
      campusName: student.campusName,
      foodPreference: student.foodPreference,
      address: student.address,
      walletBalance: parseFloat(student.walletBalance ?? "0"),
      isProfileComplete: student.name !== "Student" && !!student.campusId,
    },
  });
});

export default router;
