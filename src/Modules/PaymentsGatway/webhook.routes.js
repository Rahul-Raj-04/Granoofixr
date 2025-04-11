import { Router } from "express";
import { phonepeWebhook, razorpayWebhook } from "./webhookController.js";

const router = Router();

router.post("/webhook/razorpay", razorpayWebhook);
router.post("/webhook/phonepe", phonepeWebhook);
export default router;
