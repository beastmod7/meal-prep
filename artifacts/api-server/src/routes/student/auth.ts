import { Router } from "express";
import { db } from "@workspace/db";
import { studentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signStudentToken } from "../../middlewares/studentAuth.js";
import { randomUUID } from "crypto";
import rateLimit from "express-rate-limit";

const router = Router();

// 10 OTP requests per phone per 15 minutes
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { error: "Too Many Requests", message: "Too many OTP requests. Please wait 15 minutes." },
});

// 20 verify attempts per IP per 15 minutes
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { error: "Too Many Requests", message: "Too many verification attempts. Please wait 15 minutes." },
});

/**
 * POST /api/student/auth/send-otp
 *
 * Dev-mode stub: always accepts any phone number and "sends" OTP 123456.
 * Production: replace with Twilio / MSG91 / Supabase Auth OTP.
 */
router.post("/send-otp", otpLimiter, async (req, res) => {
  const { phone } = req.body as { phone?: string };

  if (!phone || !/^\+?[0-9]{10,13}$/.test(phone.replace(/\s/g, ""))) {
    res.status(400).json({ error: "Bad Request", message: "Invalid phone number" });
    return;
  }

  req.log.info({ phone }, "OTP send requested (dev stub)");
  res.json({ message: "OTP sent", devNote: "Use OTP 123456 in development" });
});

/**
 * POST /api/student/auth/verify-otp
 *
 * Dev-mode stub: accepts phone + otp=123456, upserts student, returns JWT.
 * Production: replace with real OTP verification (Twilio / MSG91 / Supabase Auth).
 */
router.post("/verify-otp", verifyLimiter, async (req, res) => {
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
