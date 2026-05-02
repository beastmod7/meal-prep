import { Router, type IRouter } from "express";
import healthRouter from "./health";
import restaurantPortalRouter from "./restaurantPortal/index.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/restaurant-portal", restaurantPortalRouter);

export default router;
