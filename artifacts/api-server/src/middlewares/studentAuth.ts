import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET ?? "fallback-dev-secret";

export interface StudentTokenPayload {
  studentId: string;
  phone: string;
  name: string;
}


/**
 * Validates the student Bearer JWT.
 *
 * NOTE — Supabase migration:
 * Replace this middleware with Supabase JWT verification.
 * The Supabase JWT is signed with the project's JWT secret and contains
 * `sub` (= auth.users.id = our students.id) and `phone`.
 * Swap the verify call to use the Supabase JWT secret from env, then map
 * payload.sub → studentId, payload.phone → phone.
 * The rest of the route code is unchanged.
 */
export function requireStudentAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", message: "Missing Bearer token" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as StudentTokenPayload;
    req.student = payload;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized", message: "Invalid or expired token" });
  }
}

export function signStudentToken(payload: StudentTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}
