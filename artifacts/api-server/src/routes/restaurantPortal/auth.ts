import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { portalUsersTable, restaurantAccessTable, restaurantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requirePortalAuth, signPortalToken } from "../../middlewares/restaurantPortalAuth.js";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    res.status(400).json({ error: "Bad Request", message: "email and password are required" });
    return;
  }

  const [user] = await db
    .select()
    .from(portalUsersTable)
    .where(eq(portalUsersTable.email, email.toLowerCase().trim()))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    return;
  }

  const accessRows = await db
    .select({ restaurantId: restaurantAccessTable.restaurantId, restaurantName: restaurantsTable.name })
    .from(restaurantAccessTable)
    .innerJoin(restaurantsTable, eq(restaurantAccessTable.restaurantId, restaurantsTable.id))
    .where(eq(restaurantAccessTable.userId, user.id));

  const restaurantIds = accessRows.map((r) => r.restaurantId);
  const restaurantNames = accessRows.map((r) => r.restaurantName);

  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    restaurantIds,
  };

  const token = signPortalToken(payload);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      restaurantIds,
      restaurantNames,
    },
  });
});

router.get("/me", requirePortalAuth, async (req, res) => {
  const { userId } = req.portalUser!;

  const [user] = await db
    .select()
    .from(portalUsersTable)
    .where(eq(portalUsersTable.id, userId))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "User not found" });
    return;
  }

  const accessRows = await db
    .select({ restaurantId: restaurantAccessTable.restaurantId, restaurantName: restaurantsTable.name })
    .from(restaurantAccessTable)
    .innerJoin(restaurantsTable, eq(restaurantAccessTable.restaurantId, restaurantsTable.id))
    .where(eq(restaurantAccessTable.userId, user.id));

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    restaurantIds: accessRows.map((r) => r.restaurantId),
    restaurantNames: accessRows.map((r) => r.restaurantName),
  });
});

export default router;
