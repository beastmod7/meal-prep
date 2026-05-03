import type { StudentTokenPayload } from "../middlewares/studentAuth.js";
import type { PortalTokenPayload } from "../middlewares/restaurantPortalAuth.js";

declare global {
  namespace Express {
    interface Request {
      student?: StudentTokenPayload;
      portalUser?: PortalTokenPayload;
    }
  }
}
