import { Router } from "express";
import {
  getAllOrders,
  getOrderById,
  getUserOrders,
  placeOrder,
  updateOrderStatus,
} from "./Order.controler.js";
import { verifyJWT } from "../../middlewares/auth.middlwares.js";

const router = Router();

router.route("/place").post(placeOrder);
router.get("/orders/:orderId", getOrderById);

router.route("/my-orders").get(verifyJWT, getUserOrders);
router.get("/", getAllOrders);
router.patch("/update", updateOrderStatus);

export default router;
