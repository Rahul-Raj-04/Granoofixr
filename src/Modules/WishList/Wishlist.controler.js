import { asyncHandler } from "../../utils/asyncHandler.js";
import { Wishlist } from "./Wishlist.modal.js";
import { Product } from "../Product/Product.models.js";

// Add a product to the wishlist
export const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;

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

  // Find the user's wishlist
  let wishlist = await Wishlist.findOne({ user: req.user._id });

  // If the user doesn't have a wishlist, create a new one
  if (!wishlist) {
    wishlist = new Wishlist({
      user: req.user._id,
      products: [],
    });
  }

  // Check if the product is already in the wishlist
  if (!wishlist.products.includes(productId)) {
    wishlist.products.push(productId);
    await wishlist.save();
  }

  res.status(200).json({
    success: true,
    message: "Product added to wishlist successfully",
    wishlist,
  });
});

// Remove a product from the wishlist
export const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  if (!productId) {
    throw new ApiError(400, "Product ID is required");
  }

  if (!req.user || !req.user._id) {
    throw new ApiError(401, "User not authenticated");
  }

  // Find the user's wishlist
  let wishlist = await Wishlist.findOne({ user: req.user._id });

  if (!wishlist) {
    throw new ApiError(404, "Wishlist not found");
  }

  // Remove the product if it exists in the wishlist
  wishlist.products = wishlist.products.filter(
    (id) => id.toString() !== productId
  );

  await wishlist.save();

  res.status(200).json({
    success: true,
    message: "Product removed from wishlist successfully",
    wishlist,
  });
});

// Get the user's wishlist
export const getWishlist = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    throw new ApiError(401, "User not authenticated");
  }

  const wishlist = await Wishlist.findOne({ user: req.user._id }).populate(
    "products"
  );

  res.status(200).json({
    success: true,
    wishlist: wishlist || { user: req.user._id, products: [] },
  });
});
