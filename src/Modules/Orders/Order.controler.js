import { Product } from "../Product/Product.models.js";
import Transaction from "../Transactions/Transaction.model.js";
import { Order } from "./Order.model.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import axios from "axios";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const placeOrder = async (req, res) => {
  try {
    const { customer, products, shippingInfo, paymentInfo, totalAmount } =
      req.body;

    if (
      !customer ||
      !products ||
      !shippingInfo ||
      !paymentInfo ||
      !totalAmount
    ) {
      return res.status(400).json({ message: "All fields are required." });
    }

    let calculatedTotal = 0;
    for (const item of products) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res
          .status(404)
          .json({ message: `Product not found: ${item.product}` });
      }

      let finalPrice = product.price;
      if (product.discountType === "fixedDiscount") {
        finalPrice = Math.max(product.price - product.discountPrice, 0);
      } else if (product.discountType === "percentDiscount") {
        finalPrice = Math.max(
          product.price - (product.price * product.discountPercent) / 100,
          0
        );
      }

      calculatedTotal += finalPrice * item.quantity;
    }

    calculatedTotal = Math.round(calculatedTotal);

    if (calculatedTotal !== totalAmount) {
      return res.status(400).json({
        message: "Total amount mismatch, possible price manipulation.",
        calculatedTotal,
        receivedTotal: totalAmount,
      });
    }

    const paymentStatus =
      paymentInfo.method === "COD" ? "Pending" : "Processing";

    const newOrder = new Order({
      customer,
      products,
      totalAmount: calculatedTotal,
      shippingInfo,
      paymentInfo: {
        method: paymentInfo.method,
        status: paymentStatus,
      },
      status: "Pending",
    });

    await newOrder.save();

    // 🔻 Reduce stock for each product
    for (const item of products) {
      const product = await Product.findById(item.product);
      if (!product) continue;

      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `Not enough stock for product: ${product.name}`,
        });
      }

      product.stock -= item.quantity;
      await product.save();
    }

    const transactionId = `TXN_${Date.now()}_${Math.floor(
      Math.random() * 10000
    )}`;
    let paymentGatewayData = {};

    if (paymentInfo.gateway === "Razorpay") {
      const razorpayOrder = await razorpay.orders.create({
        amount: calculatedTotal * 100,
        currency: "INR",
        receipt: transactionId,
        payment_capture: 1,
      });

      paymentGatewayData = {
        gatewayOrderId: razorpayOrder.id,
        gatewayResponse: razorpayOrder,
      };

      console.log("✅ Razorpay Order Created:", razorpayOrder.id);
    }

    if (paymentInfo.gateway === "PhonePe") {
      const phonePeData = {
        merchantId: process.env.PHONEPE_MERCHANT_ID,
        amount: calculatedTotal * 100,
        transactionId,
        redirectUrl: "https://your-website.com/payment-success",
        callbackUrl: "https://your-website.com/api/webhooks/phonepe",
      };

      const checksum = crypto
        .createHash("sha256")
        .update(JSON.stringify(phonePeData) + process.env.PHONEPE_SALT_KEY)
        .digest("hex");

      phonePeData.checksum = checksum;

      const phonePeResponse = await axios.post(
        "https://api.phonepe.com/pay",
        phonePeData
      );

      paymentGatewayData = {
        gatewayOrderId: transactionId,
        gatewayResponse: phonePeResponse.data,
      };

      console.log("✅ PhonePe Order Created:", transactionId);
    }

    const transaction = new Transaction({
      orderId: newOrder._id,
      user: customer,
      transactionId,
      productId: products.map((p) => p.product).join(","),
      orderStatus: "Pending",
      paymentStatus,
      totalAmount: calculatedTotal,
      paymentMethod: paymentInfo.method,
      paymentGateway: paymentInfo.gateway,
      paidAmount: paymentInfo.method === "COD" ? 0 : calculatedTotal,
      paymentGatewayData,
      gatewayOrderId: paymentGatewayData.gatewayOrderId,
    });

    await transaction.save();

    res.status(201).json({
      message: "Order placed successfully.",
      order: newOrder,
      transaction,
      paymentGatewayData,
    });
  } catch (error) {
    console.error("❌ Error placing order:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const getOrderById = async (req, res) => {
  try {
    // Get order ID from params, query, or body
    const orderId = req.params.orderId || req.query.orderId || req.body.orderId;

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required." });
    }

    // Fetch the order with customer and product details
    const order = await Order.findById(orderId)
      .populate("customer", "fullName email phone")
      .populate("products.product", "name price image");

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    // Prepare formatted response
    const orderDetails = {
      orderID: order.orderID,
      createdAt: order.createdAt,
      status: order.status,
      customer: {
        name: order.customer?.fullName || "N/A",
        email: order.customer?.email || "N/A",
        phone: order.customer?.phone || "N/A",
      },
      shippingInfo: order.shippingInfo,
      paymentInfo: {
        method: order.paymentInfo.method,
        status: order.paymentInfo.status,
      },
      products: order.products.map((item) => ({
        name: item.product?.name || "Unknown Product",
        image: item.product?.image?.[0] || null, // Assuming product has an image array
        unitPrice: item.price,
        quantity: item.quantity,
        total: item.price * item.quantity,
      })),
      subtotal: order.totalAmount,
      shippingCost: 49.55, // You can dynamically calculate this if needed
      grandTotal: order.totalAmount + 49.55, // Adjust for actual shipping cost
    };

    res.status(200).json(orderDetails);
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("customer", "fullName email phone profileImage") // Fetch customer details
      .populate("products.product", "name price image") // Fetch product details
      .sort({ createdAt: -1 });

    const formattedOrders = orders.map((order) => ({
      _id: order._id,
      orderID: order.orderID,
      customer: {
        name: order.customer?.fullName || "N/A",
        image: order.customer?.profileImage || "https://via.placeholder.com/50", // Default image
      },
      totalItems: order.products.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice: order.products.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      ),
      status: order.status,
      orderDate: new Date(order.createdAt).toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    }));

    res.status(200).json(formattedOrders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Server error" });
  }
};
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.query;
    const { status } = req.body;

    if (!status || typeof status !== "string") {
      return res
        .status(400)
        .json({ message: "Status is required and must be a valid string." });
    }

    const validStatuses = [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    if (
      order.status === "Delivered" &&
      ["Pending", "Processing", "Shipped"].includes(status)
    ) {
      return res.status(400).json({
        message: "Cannot change status from Delivered to a previous stage.",
      });
    }

    const previousStatus = order.status;
    const wasDelivered = previousStatus === "Delivered";

    if (
      order.orderHistory.length === 0 ||
      order.orderHistory[order.orderHistory.length - 1].status !== status
    ) {
      order.orderHistory.push({ status, changedAt: new Date() });
    }

    order.status = status;

    const transaction = await Transaction.findOne({ orderId });
    if (transaction) {
      transaction.orderStatus = status;

      if (
        (status === "Processing" || status === "Shipped") &&
        transaction.paymentStatus !== "Paid"
      ) {
        transaction.paymentStatus = "Pending";
      } else if (status === "Delivered") {
        transaction.paymentStatus = "Paid"; // ✅ Correct Enum Value
      } else if (status === "Cancelled") {
        transaction.paymentStatus =
          order.paymentInfo.method === "COD" ? "Cancelled" : "Refunded";
        order.paymentInfo.status = transaction.paymentStatus;
      }

      if (wasDelivered && status === "Cancelled") {
        transaction.paymentStatus =
          order.paymentInfo.method === "COD" ? "Cancelled" : "Refunded";
      }

      transaction.updatedAt = new Date();
      await transaction.save();
    }

    await order.save();

    res.status(200).json({
      message: "Order and transaction status updated successfully.",
      order,
      transaction,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
export const getUserOrders = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized access." });
    }

    const orders = await Order.find({ customer: req.user._id }) // Fetch orders of logged-in user
      .populate("products.product", "name price image") // Fetch product details
      .sort({ createdAt: -1 });

    const formattedOrders = orders.map((order) => ({
      _id: order._id,
      orderID: order.orderID,
      totalItems: order.products.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice: order.products.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      ),
      status: order.status,
      orderDate: new Date(order.createdAt).toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    }));

    res.status(200).json(formattedOrders);
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({ message: "Server error" });
  }
};