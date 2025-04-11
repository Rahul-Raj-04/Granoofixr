import { Router } from "express";
import {
  getTransactionById,
  getTransactions,
} from "./Transaction.controler.js";
import {
  verifyPhonePePayment,
  verifyRazorpayPayment,
} from "../PaymentsGatway/webhookController.js";

const router = Router();

router.route("/all").get(getTransactions);
router.route("/").get(getTransactionById);
router.post("/verify/razorpay", verifyRazorpayPayment);
router.post("/verify/phonepe", verifyPhonePePayment);

export default router;
