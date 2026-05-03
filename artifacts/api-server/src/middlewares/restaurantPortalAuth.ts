import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET ?? "fallback-dev-secret";

export interface PortalTokenPayload {
  userId: string;
  email: string;
  name: string;
  role: "restaurant_owner" | "restaurant_staff" | "admin" | "super_admin";
  restaurantIds: string[];
}


export function requirePortalAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", message: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as PortalTokenPayload;
    req.portalUser = payload;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized", message: "Invalid or expired token" });
  }
}

export function requireRestaurantAccess(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const user = req.portalUser;
  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "Not authenticated" });
    return;
  }

  const restaurantId = req.params["restaurantId"] as string | undefined;
  if (user.role === "admin" || user.role === "super_admin") {
    next();
    return;
  }

  if (!restaurantId || !user.restaurantIds.includes(restaurantId)) {
    res.status(403).json({ error: "Forbidden", message: "No access to this restaurant" });
    return;
  }

  next();
}

export function signPortalToken(payload: PortalTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
