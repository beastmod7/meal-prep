import { Router } from "express";
import { db } from "@workspace/db";
import { campusesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// Public — no auth required (used on onboarding before login)
router.get("/", async (req, res) => {
  const campuses = await db
    .select()
    .from(campusesTable)
    .where(eq(campusesTable.active, true))
    .orderBy(campusesTable.name);

  res.json(
    campuses.map((c) => ({
      id: c.id,
      name: c.name,
      city: c.city,
      area: c.area,
    })),
  );
});

export default router;
