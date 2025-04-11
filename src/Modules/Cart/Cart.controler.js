import { asyncHandler } from "../../utils/asyncHandler.js";
import { Cart } from "./Cart.model.js";
import { Product } from "../Product/Product.models.js"; // Import the Product model
import { ApiError } from "../../utils/ApiError.js";

const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId) {
    throw new ApiError(400, "Product ID is required");
  }

  if (!req.user || !req.user._id) {
    throw new ApiError(401, "User not authenticated");
  }

  // Check if the product exists
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Find the user's cart
  let cart = await Cart.findOne({ user: req.user._id });

  // If the user doesn't have a cart, create a new one
  if (!cart) {
    cart = new Cart({
      user: req.user._id,
      items: [],
      total: 0,
      status: "active",
    });
  }

  // Check if the product is already in the cart
  const existingItemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId
  );

  if (existingItemIndex !== -1) {
    // If the product is already in the cart, update the quantity
    cart.items[existingItemIndex].quantity += quantity || 1;
  } else {
    // If the product is not in the cart, add it as a new item
    cart.items.push({
      product: productId,
      quantity: quantity || 1,
    });
  }

  // Save the cart
  await cart.save();

  res.status(200).json({
    success: true,
    message: "Product added to cart successfully",
    cart,
    username: req.user.fullName,
  });
});

const getCart = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    throw new ApiError(401, "User not authenticated");
  }

  let cart = await Cart.findOne({ user: req.user._id }).populate({
    path: "items.product",
    select:
      "name price description image discountType discountPrice discountPercent",
  });

  if (!cart) {
    res.status(404).json({
      success: false,
      message: "Cart not found",
    });
    return;
  }

  // Recalculate the latest price for each item
  cart.items.forEach((item) => {
    let latestPrice = item.product.price;
    if (item.product.discountType === "fixedDiscount") {
      latestPrice = Math.max(
        0,
        item.product.price - item.product.discountPrice
      );
    } else if (item.product.discountType === "percentDiscount") {
      latestPrice = Math.max(
        0,
        item.product.price -
          (item.product.price * item.product.discountPercent) / 100
      );
    }
    item.price = latestPrice; // Update item price dynamically
  });

  // Calculate the updated total
  cart.total = cart.items.reduce(
    (total, item) => total + item.quantity * item.price,
    0
  );

  res.status(200).json({
    success: true,
    message: "Cart retrieved successfully",
    cart,
    username: req.user.fullName,
  });
});

const removeFromCart = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  if (!productId) {
    throw new ApiError(400, "Product ID is required");
  }

  if (!req.user || !req.user._id) {
    throw new ApiError(401, "User not authenticated");
  }

  // Find the user's cart
  let cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    throw new ApiError(404, "Cart not found");
  }

  // Find the index of the item to remove
  const itemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId
  );

  if (itemIndex === -1) {
    throw new ApiError(404, "Product not found in cart");
  }

  // Remove the item from the cart
  cart.items.splice(itemIndex, 1);

  // Recalculate the total price of the cart
  cart.total = cart.items.reduce(
    (total, item) => total + item.quantity * item.price,
    0
  );

  // Save the cart
  await cart.save();

  // Omit quantity from the response cart object
  const responseCart = {
    ...cart.toObject(),
    items: cart.items.map((item) => ({
      product: item.product,
      price: item.price,
    })),
  };

  res.status(200).json({
    success: true,
    message: "Product removed from cart successfully",
    cart: responseCart,
    username: req.user.fullName,
  });
});

export { addToCart, getCart, removeFromCart };
