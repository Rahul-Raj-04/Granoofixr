import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import Transaction from "./Transaction.model.js";
import { Product } from "../Product/Product.models.js";

// Get all transactions
export const getTransactions = asyncHandler(async (req, res) => {
  const transactions = await Transaction.find({});
  if (!transactions) {
    throw new ApiError(404, "No transactions found");
  }
  res
    .status(200)
    .json(
      new ApiResponse(200, transactions, "Transactions fetched successfully")
    );
});
export const getTransactionById = asyncHandler(async (req, res) => {
  const { id } = req.query;

  // Find transaction by ID
  const transaction = await Transaction.findById(id);
  if (!transaction) {
    throw new ApiError(404, "Transaction not found");
  }

  // Convert productId into an array
  const productIds = Array.isArray(transaction.productId)
    ? transaction.productId.flatMap(id => id.split(","))
    : [];

  // Fetch product details from Product model
  const products = await Product.find({ _id: { $in: productIds } });

  // Format products array
  const productDetails = products.map((product) => ({
    productId: product._id,
    name: product.name, // Assuming Product schema has a 'name' field
  }));

  // Formatting response as per required JSON structure
  const formattedResponse = {
    transactionId: transaction.transactionId,
    orderId: transaction.orderId,
    paymentStatus: transaction.paymentStatus,
    paymentMethod: transaction.paymentMethod || "Not Available",
    orderStatus: transaction.orderStatus,
    totalAmount: transaction.totalAmount,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
    products: productDetails, // Updated with product names
  };

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        formattedResponse,
        "Transaction fetched successfully"
      )
    );
});

