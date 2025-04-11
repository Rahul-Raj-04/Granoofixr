import { ApiError } from "../../utils/ApiError.js";

import { User } from "../User/User.model.js";

import { asyncHandler } from "../../utils/asyncHandler.js";
import { Order } from "../Orders/Order.model.js";
import { Product } from "../Product/Product.models.js";

const getProductNameById = (productId) => {
  const product = Product.find({ _id: productId });
  //console.log(product);
  return product ? product.name : "Unknown Product";
};
const DashBoardHeaderData = asyncHandler(async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }

  const now = new Date();
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0
  ); // Today 00:00:00
  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59
  ); // Today 23:59:59

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  let totalOrderValue = 0,
    totalOrderCount = 0,
    totalUserCount = 0,
    todayOrderCount = 0;

  // **Fetch Orders**
  const orderData = await Order.find({});
  const previousOrders = await Order.find({
    createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo },
  });

  totalOrderValue = orderData.reduce((acc, curr) => acc + curr.totalAmount, 0);
  totalOrderCount = orderData.length;

  // **Today's Orders**
  const todayOrdersData = orderData.filter(
    (doc) =>
      new Date(doc.createdAt) >= startOfDay &&
      new Date(doc.createdAt) <= endOfDay
  );
  todayOrderCount = todayOrdersData.length;

  // **Fetch User Count**
  totalUserCount = await User.countDocuments();
  const previousUserCount = await User.countDocuments({
    createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo },
  });

  // **Percentage Calculation Function**
  const getPercentageChange = (current, previous) => {
    if (previous === 0) return 100; // Avoid division by zero
    return ((current - previous) / previous) * 100;
  };

  const orderGrowth = getPercentageChange(
    totalOrderCount,
    previousOrders.length
  );
  const salesGrowth = getPercentageChange(
    totalOrderValue,
    previousOrders.reduce((acc, curr) => acc + curr.totalAmount, 0)
  );
  const userGrowth = getPercentageChange(totalUserCount, previousUserCount);
  const todayOrderGrowth = getPercentageChange(
    todayOrderCount,
    previousOrders.length
  );

  // **Fetch Product Names Properly**
  const formattedTodayOrders = await Promise.all(
    todayOrdersData.map(async (order) => {
      const productsWithNames = await Promise.all(
        order.products.map(async (product) => {
          const productData = await Product.findById(product.product).select(
            "name"
          ); // Fetch product name
          return {
            name: productData ? productData.name : "Unknown Product",
            amount: product.price,
          };
        })
      );

      return {
        orderID: order.orderID,
        customer: order.customer,
        products: productsWithNames,
        totalAmount: order.totalAmount,
        status: order.status,
        review: "",
      };
    })
  );

  return res.json({
    success: true,
    data: {
      totalOrderValue,
      totalOrderCount,
      totalUserCount,
      todayOrderCount, // ✅ Changed recent orders to today orders
      orderGrowth: `${orderGrowth.toFixed(2)}%`,
      salesGrowth: `${salesGrowth.toFixed(2)}%`,
      userGrowth: `${userGrowth.toFixed(2)}%`,
      todayOrderGrowth: `${todayOrderGrowth.toFixed(2)}%`, // ✅ Growth of today's orders
      earnings: 0,
      refunds: 0,
      conversionRatio: 0,
      todayOrdersData: formattedTodayOrders, // ✅ Corrected product names
    },
    message: "Dashboard data retrieved successfully",
  });
});

const DashBoardBSProductData = asyncHandler(async (req, res) => {
  const result = await Order.aggregate([
    { $unwind: "$products" },
    {
      $group: {
        _id: "$products.product",
        totalQuantity: { $sum: "$products.quantity" },
        totalTurnover: {
          $sum: { $multiply: ["$products.quantity", "$products.price"] },
        },
      },
    },
    {
      $sort: { totalQuantity: -1 },
    },
    {
      $limit: 5,
    },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "productDetails",
      },
    },
    {
      $unwind: "$productDetails",
    },
    {
      $project: {
        ProductID: "$productDetails._id",
        Product: "$productDetails.name",
        Category: "$productDetails.category",
        RemainingQuantity: "$productDetails.stock.quantity",
        turnOver: "$totalTurnover",
        IncreaseBy: "0",
      },
    },
  ]);

  if (result.length > 0) {
    console.log("Best Selling Product ID:", result[0]._id);
    console.log("Total Quantity Sold:", result[0].totalQuantity);
  } else {
    console.log("No data found");
  }
  return res.json({
    success: true,
    data: { result: result },
    message: "DashBoard Data get successfully",
  });
});

const DashBoardRecentUserData = asyncHandler(async (req, res) => {
  const result = await User.aggregate([
    { $unwind: "$products" },
    {
      $group: {
        _id: "$products.product",
        totalQuantity: { $sum: "$products.quantity" },
        totalTurnover: {
          $sum: { $multiply: ["$products.quantity", "$products.price"] },
        },
      },
    },
    {
      $sort: { totalQuantity: -1 },
    },
    {
      $limit: 5,
    },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "productDetails",
      },
    },
    {
      $unwind: "$productDetails",
    },
    {
      $project: {
        ProductID: "$productDetails._id",
        Product: "$productDetails.name",
        Category: "$productDetails.category",
        RemainingQuantity: "$productDetails.stock.quantity",
        turnOver: "$totalTurnover",
        IncreaseBy: "0",
      },
    },
  ]);

  if (result.length > 0) {
    console.log("Best Selling Product ID:", result[0]._id);
    console.log("Total Quantity Sold:", result[0].totalQuantity);
  } else {
    console.log("No data found");
  }
  return res.json({
    success: true,
    data: { result: result },
    message: "DashBoard Data get successfully",
  });
});

export { DashBoardHeaderData, DashBoardBSProductData, DashBoardRecentUserData };
