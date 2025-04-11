// controllers/paymentsController.js

import Razorpay from "razorpay";
import crypto from "crypto";

import { Payment } from "./Payments.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Order } from "../Orders/Order.model.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create a new payment
export const createPayment = async (req, res) => {
  const { orderId, amount, currency, paymentMethod, userId } = req.body;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: amount * 100,
      currency,
      payment_capture: 1,
    });

    const payment = new Payment({
      order: order._id,
      user: userId,
      paymentID: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      razorpayOrderId: razorpayOrder.id,
      amount,
      currency,
      paymentMethod,
      status: razorpayOrder.status,
    });

    await payment.save();

    res.status(201).json({
      payment,
      order: razorpayOrder,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Verify a payment

export const verifyPayment = async (req, res) => {
  const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature } =
    req.body;

  try {
    // Fetch the payment
    const payment = await Payment.findOne({ razorpayOrderId });
    if (!payment) {
      console.error("Payment not found for razorpayOrderId:", razorpayOrderId);
      return res.status(404).json({ error: "Payment not found" });
    }

    // Verify the signature
    const body = orderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpaySignature) {
      // Update payment status
      payment.razorpayPaymentId = razorpayPaymentId;
      payment.razorpaySignature = razorpaySignature;
      payment.status = "paid";
      await payment.save();

      console.log("Payment verified and updated successfully:", payment);
      return res
        .status(200)
        .json({ status: "Payment verified successfully", payment });
    } else {
      console.error("Invalid signature");
      return res
        .status(400)
        .json({ status: "Invalid signature", payment: null });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    return res.status(500).json({ error: error.message });
  }
};

// Get payment details
export const getPaymentDetails = async (req, res) => {
  const { paymentId } = req.params;

  try {
    const payment = await Payment.findOne({ paymentID: paymentId }).populate(
      "order"
    );
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    res.status(200).json({ payment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all payments
export const getAllPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find()
    .populate("order")
    .populate("user", "fullName email");
  return res.json({
    success: true,
    data: payments,
    message: "All payments retrieved successfully",
  });
});
