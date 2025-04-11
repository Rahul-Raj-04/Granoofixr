import { Router } from "express";
import {
  createCoupon,
  deleteCoupon,
  editCoupon,
  getCoupons,
} from "./Coupon.controler.js";
const router = Router();
router.route("/add").post(createCoupon);
router.route("/delete").delete(deleteCoupon);
router.route("/coupons").get(getCoupons);
router.route("/update").patch(editCoupon);
export default router;
