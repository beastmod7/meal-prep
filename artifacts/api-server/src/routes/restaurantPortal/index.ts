import { Router } from "express";
import authRouter from "./auth.js";
import overviewRouter from "./overview.js";
import packagesRouter from "./packages.js";
import upcomingMealsRouter from "./upcomingMeals.js";
import cancellationsRouter from "./cancellations.js";
import settlementsRouter from "./settlements.js";
import reportsRouter from "./reports.js";

const router = Router();

router.use("/auth", authRouter);
router.use("/restaurants/:restaurantId/overview", overviewRouter);
router.use("/restaurants/:restaurantId/packages", packagesRouter);
router.use("/restaurants/:restaurantId/upcoming-meals", upcomingMealsRouter);
router.use("/restaurants/:restaurantId/orders", upcomingMealsRouter);
router.use("/restaurants/:restaurantId/cancellations", cancellationsRouter);
router.use("/restaurants/:restaurantId/settlements", settlementsRouter);
router.use("/restaurants/:restaurantId/reports", reportsRouter);

export default router;
