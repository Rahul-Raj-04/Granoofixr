import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    transactionId: { type: String, unique: true }, // ❌ Not required initially
    productId: [{ type: String, required: true }], // ✅ Supports multiple products

    paymentStatus: {
      type: String,
      enum: ["Pending", "Processing", "Paid", "Cancelled","Refunded"],
      required: true,
      default: "Pending",
    },
    paymentMethod: {
      type: String,
      enum: [
        "COD",
        "UPI",
        "Credit Card",
        "Debit Card",
        "Net Banking",
        "Wallet",
      ],
      required: true,
    },
    paymentGateway: {
      type: String,
      enum: ["COD", "Razorpay", "PhonePe", "Paytm", "PayPal", "Stripe", "PayU"],
      
      required: true,
    },

    gatewayTransactionId: { type: String, default: null }, // ✅ Stores Payment ID from any gateway
    gatewayOrderId: { type: String, default: null }, // ✅ Stores Order ID from any gateway
    gatewaySignature: { type: String, default: null }, // ✅ Stores signature if applicable
    gatewayResponse: { type: Object, default: {} }, // ✅ Stores full response from any gateway

    webhookVerified: { type: Boolean, default: false }, // ✅ Ensures webhook verification

    paidAmount: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    currency: { type: String, default: "INR" }, // ✅ Multi-currency support

    orderStatus: {
      type: String,
      enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
      required: true,
    },

    refundStatus: {
      type: String,
      enum: ["Not Initiated", "Processing", "Completed", "Failed"],
      default: "Not Initiated",
    },
    refundId: { type: String, default: null }, // ✅ Stores refund transaction ID if applicable
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
