import crypto from "crypto";
import Transaction from "../Transactions/Transaction.model.js";
import { Order } from "../Orders/Order.model.js";

// 🎯 Razorpay Webhook Handler
export const razorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const signature = req.headers["x-razorpay-signature"];
    const body = JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (expectedSignature === signature) {
      const { order_id, payment_id, status } = req.body.payload.payment.entity;

      const transaction = await Transaction.findOneAndUpdate(
        { orderId: order_id },
        {
          transactionId: payment_id,
          paymentStatus: status === "captured" ? "Completed" : "Failed",
          gatewayTransactionId: payment_id,
          gatewayOrderId: order_id,
          gatewaySignature: signature,
          gatewayResponse: req.body,
          webhookVerified: true,
        },
        { new: true }
      );

      if (!transaction) {
        return res
          .status(404)
          .json({ success: false, message: "Transaction not found" });
      }

      return res.json({
        success: true,
        message: "Payment Verified",
        transaction,
      });
    }

    res.status(400).json({ success: false, message: "Invalid Signature" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
export const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment details" });
    }

    // ✅ Generate signature for verification
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Payment verification failed" });
    }

    // ✅ Find transaction using correct query
    const transaction = await Transaction.findOne({
      gatewayOrderId: razorpay_order_id,
    });

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found. Possible incorrect Razorpay Order ID.",
      });
    }

    // ✅ Update transaction and order status
    transaction.paymentStatus = "Paid";
    transaction.paidAmount = transaction.totalAmount;
    transaction.gatewayTransactionId = razorpay_payment_id;
    transaction.gatewaySignature = razorpay_signature;
    await transaction.save();

    await Order.findByIdAndUpdate(transaction.orderId, {
      "paymentInfo.status": "Paid",
      status: "Confirmed",
    });

    res.json({
      message: "Payment verified successfully",
      transaction,
    });
  } catch (error) {
    console.error("❌ Error verifying Razorpay payment:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
// 🎯 PhonePe Webhook Handler
export const phonepeWebhook = async (req, res) => {
  try {
    const receivedData = req.body;
    const checksum = receivedData.checksum;

    const calculatedChecksum = crypto
      .createHash("sha256")
      .update(
        Buffer.from(JSON.stringify(receivedData) + process.env.PHONEPE_SALT_KEY)
      )
      .digest("hex");

    if (checksum === calculatedChecksum) {
      const transaction = await Transaction.findOneAndUpdate(
        { transactionId: receivedData.transactionId },
        {
          paymentStatus: receivedData.status,
          webhookVerified: true,
          gatewayResponse: receivedData,
        },
        { new: true }
      );

      if (!transaction) {
        return res
          .status(404)
          .json({ success: false, message: "Transaction not found" });
      }

      return res.json({
        success: true,
        message: "Payment Verified",
        transaction,
      });
    }

    res.status(400).json({ success: false, message: "Invalid Checksum" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
export const verifyPhonePePayment = async (req, res) => {
  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({ message: "Invalid transaction ID" });
    }

    const merchantId = process.env.PHONEPE_MERCHANT_ID;
    const saltKey = process.env.PHONEPE_SALT_KEY;

    // ✅ Generate checksum for verification
    const checksumString = `/pg/v1/status/${merchantId}/${transactionId}${saltKey}`;
    const checksum = crypto
      .createHash("sha256")
      .update(checksumString)
      .digest("hex");

    const headers = {
      "Content-Type": "application/json",
      "X-VERIFY": checksum,
    };

    const phonePeResponse = await axios.get(
      `https://api.phonepe.com/pg/v1/status/${merchantId}/${transactionId}`,
      { headers }
    );

    if (phonePeResponse.data.success) {
      // ✅ Update transaction and order status
      const transaction = await Transaction.findOneAndUpdate(
        { transactionId },
        { paymentStatus: "Paid", paidAmount: transaction.totalAmount },
        { new: true }
      );

      await Order.findByIdAndUpdate(transaction.orderId, {
        "paymentInfo.status": "Paid",
        status: "Confirmed",
      });

      res.json({ message: "Payment verified successfully", transaction });
    } else {
      res.status(400).json({ message: "Payment verification failed" });
    }
  } catch (error) {
    console.error("Error verifying PhonePe payment:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
