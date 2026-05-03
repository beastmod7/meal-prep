import { Router } from "express";
import authRouter from "./auth.js";
import profileRouter from "./profile.js";
import restaurantsRouter from "./restaurants.js";
import subscriptionsRouter from "./subscriptions.js";
import ordersRouter from "./orders.js";
import ledgerRouter from "./ledger.js";
import campusesRouter from "./campuses.js";

const router = Router();

router.use("/auth", authRouter);
router.use("/profile", profileRouter);
router.use("/restaurants", restaurantsRouter);
router.use("/subscriptions", subscriptionsRouter);
router.use("/orders", ordersRouter);
router.use("/ledger", ledgerRouter);
router.use("/campuses", campusesRouter);

export default router;
