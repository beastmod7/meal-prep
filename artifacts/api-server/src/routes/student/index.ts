import { Router } from "express";
import authRouter from "./auth.js";
import profileRouter from "./profile.js";
import restaurantsRouter from "./restaurants.js";
import subscriptionsRouter from "./subscriptions.js";
import ordersRouter from "./orders.js";
import ledgerRouter from "./ledger.js";
import campusesRouter from "./campuses.js";
import ratingsRouter from "./ratings.js";

const router = Router();

router.use("/auth", authRouter);
router.use("/profile", profileRouter);
router.use("/restaurants", restaurantsRouter);
router.use("/subscriptions", subscriptionsRouter);
router.use("/orders", ordersRouter);
router.use("/ledger", ledgerRouter);
router.use("/campuses", campusesRouter);
router.use("/ratings", ratingsRouter);

export default router;
