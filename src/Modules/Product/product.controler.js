import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../../utils/Cloudinary.js";
import { Category } from "../Category/Category.model.js";

import { Product } from "./Product.models.js";

const addProduct = asyncHandler(async (req, res) => {
  try {
    if (!req.body || !req.files) {
      throw new ApiError(400, "Request body or files are missing");
    }

    const {
      name,
      description,
      price,
      category,
      sku,
      quantity,
      stock,
      discountType,
      discountPrice,
      discountPercent,
      shipping_cost,
      size,
      color,
      tags,
    } = req.body;

    // Validate required fields
    if (
      ![name, description, price, category, sku, stock].every(
        (field) => field && field.trim()
      )
    ) {
      throw new ApiError(400, "All required fields must be filled");
    }

    // Ensure numeric fields are valid
    const parsedPrice = parseFloat(price);
    const parsedStock = parseInt(stock, 10);
    const parsedDiscountPrice = parseFloat(discountPrice) || 0;
    const parsedDiscountPercent = parseFloat(discountPercent) || 0;
    const parsedShippingCost = parseFloat(shipping_cost) || 0;

    if (isNaN(parsedPrice) || isNaN(parsedStock)) {
      throw new ApiError(400, "Price and stock must be valid numbers");
    }

    // Check for existing product by SKU
    const existingProduct = await Product.findOne({ sku });
    if (existingProduct) {
      throw new ApiError(409, "Product with the same SKU already exists");
    }

    // Fetch existing category from the database
    const existingCategory = await Category.findById(category);
    if (!existingCategory) {
      throw new ApiError(400, `Invalid category ID: ${category}`);
    }

    // Handle image upload
    const imageFiles = req.files?.image;
    if (!imageFiles || imageFiles.length === 0) {
      throw new ApiError(400, "At least one image is required");
    }

    const uploadedImages = await Promise.all(
      imageFiles.map((file) => uploadOnCloudinary(file.path))
    );

    if (!uploadedImages.length) {
      throw new ApiError(400, "Failed to upload images");
    }

    // Validate and handle tags
    const parsedTags = Array.isArray(tags) ? tags : [tags];

    // Create a new product
    const newProduct = await Product.create({
      name,
      description,
      price: parsedPrice,
      category: existingCategory._id,
      sku,
      quantity,
      stock: parsedStock,
      discountType,
      discountPrice: parsedDiscountPrice,
      discountPercent: parsedDiscountPercent,
      shipping_cost: parsedShippingCost,
      size,
      color,
      tags: parsedTags,
      image: uploadedImages.map((img) => img.url),
    });

    // Return successful response
    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: newProduct.toObject(),
    });
  } catch (error) {
    console.error("Error during product creation:", error);

    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errors: error.errors,
      });
    }

    if (error.name === "ValidationError") {
      const formattedErrors = Object.keys(error.errors).map((key) => ({
        path: key,
        message: error.errors[key].message,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: formattedErrors,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

const getAllProducts = asyncHandler(async (req, res) => {
  try {
    // Fetch all products
    const products = await Product.find().populate("category", "name");
    // Count the total number of products
    const totalProducts = await Product.countDocuments();

    // Send the response
    return res.status(200).json({
      success: true,
      message: "Products retrieved successfully",
      data: products,
      total: totalProducts,
    });
  } catch (error) {
    console.error("Error retrieving products:", error);

    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.query;

  // Check if product exists
  const product = await Product.findById(id);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  // Delete the product
  await Product.findByIdAndDelete(id);

  return res.json({
    success: true,
    message: "Product deleted successfully",
  });
});

const getSingleProduct = asyncHandler(async (req, res) => {
  try {
    const { id } = req.query; // Assuming the product ID is passed as a URL parameter

    // Validate ID presence
    if (!id) {
      throw new ApiError(400, "Product ID is required");
    }

    // Find the product by ID
    const product = await Product.findById(id);

    // Check if product was found
    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    // Return the product details
    return res.status(200).json({
      success: true,
      product: product.toObject(), // Convert Mongoose document to plain object
    });
  } catch (error) {
    console.error("Error fetching product details:", error);

    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});
const updateProduct = asyncHandler(async (req, res) => {
  try {
    const { id } = req.query;

    // Check if product exists
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      throw new ApiError(404, "Product not found");
    }

    // Extract fields from request body
    const updateFields = {};

    if (req.body.name) updateFields.name = req.body.name;
    if (req.body.description) updateFields.description = req.body.description;
    if (req.body.price) updateFields.price = parseFloat(req.body.price);

    if (req.body.category) {
      const categoryExists = await Category.findById(req.body.category);
      if (!categoryExists) {
        throw new ApiError(400, `Invalid category ID: ${req.body.category}`);
      }
      updateFields.category = req.body.category;
    }

    if (req.body.sku) updateFields.sku = req.body.sku;
    if (req.body.quantity) updateFields.quantity = req.body.quantity;
    if (req.body.stock) updateFields.stock = parseInt(req.body.stock, 10);

    // Discount Logic
    if (req.body.discountType) {
      updateFields.discountType = req.body.discountType;

      if (req.body.discountType === "fixedDiscount") {
        if (req.body.discountPrice) {
          updateFields.discountPrice = parseFloat(req.body.discountPrice);
        }
        updateFields.discountPercent = undefined;
      } else if (req.body.discountType === "percentDiscount") {
        if (req.body.discountPercent) {
          updateFields.discountPercent = parseFloat(req.body.discountPercent);
        }
        updateFields.discountPrice = undefined;
      } else if (req.body.discountType === "noDiscount") {
        updateFields.discountPrice = undefined;
        updateFields.discountPercent = undefined;
      }
    }

    if (req.body.shipping_cost)
      updateFields.shipping_cost = parseFloat(req.body.shipping_cost);
    if (req.body.size) updateFields.size = req.body.size;
    if (req.body.color) updateFields.color = req.body.color;
    if (req.body.tags) {
      updateFields.tags = Array.isArray(req.body.tags)
        ? req.body.tags
        : [req.body.tags];
    }

    // Handle image upload if new images are provided
    if (req.files?.image) {
      const imageFiles = req.files.image;
      const uploadedImages = await Promise.all(
        imageFiles.map((file) => uploadOnCloudinary(file.path))
      );
      updateFields.image = uploadedImages.map((img) => img.url);
    }

    // Update product in the database
    const updatedProduct = await Product.findByIdAndUpdate(id, updateFields, {
      new: true,
    });

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct.toObject(),
    });
  } catch (error) {
    console.error("Error updating product:", error);

    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

const approveProduct = asyncHandler(async (req, res) => {
  const { id } = req.query; // Destructure the id from the request body

  if (!id) {
    throw new ApiError(400, "Product ID is required");
  }

  // Find the product by ID
  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Update the IsApproved field to true
  product.IsApproved = true;
  await product.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isApproved: product.IsApproved },
        "Product approval status updated successfully"
      )
    );
});
const buildQuery = (params) => {
  const query = {};

  if (params.title) {
    query.title = { $regex: params.title, $options: "i" }; // Case-insensitive regex
  }
  if (params.description) {
    query.description = { $regex: params.description, $options: "i" };
  }
  if (params.price) {
    query.price = params.price;
  }
  if (params.cutPrice) {
    query.cutPrice = params.cutPrice;
  }
  if (params.categories) {
    query.categories = params.categories;
  }
  if (params.tags) {
    query.tags = params.tags;
  }
  if (params.discount) {
    query.discount = params.discount;
  }
  if (params.rating) {
    query.rating = params.rating;
  }
  if (params.stocks) {
    query.stocks = Number(params.stocks);
  }

  if (params.tags) {
    query.tags = params.tags;
  }
  if (params.sku) {
    query.sku = params.sku;
  }
  if (params.shortDescription) {
    query.shortDescription = { $in: params.shortDescription };
  }

  return query;
};

const searchProducts = asyncHandler(async (req, res) => {
  try {
    let searchParams = req.query.query;

    if (!searchParams) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Search params are required."));
    }

    const searchTerms = searchParams.split(" ");

    const query = {
      $and: searchTerms.map((term) => ({
        $or: [
          { title: { $regex: term, $options: "i" } },
          { description: { $regex: term, $options: "i" } },
          { shortDescription: { $regex: term, $options: "i" } },
          { categories: { $regex: term, $options: "i" } },
          { stocks: !isNaN(term) ? Number(term) : null },
          { brand: { $regex: term, $options: "i" } },
          { productTags: { $regex: term, $options: "i" } },
          { type: { $regex: term, $options: "i" } },
          { itemType: { $regex: term, $options: "i" } },
          { tags: { $regex: term, $options: "i" } },
        ],
      })),
    };

    const products = await Product.find(query);

    if (products.length === 0) {
      await SearchData.create({ searchParam: searchParams });
      // Throw a 404 error if no products are found
      throw new ApiError(404, "No products found matching the criteria.");
    }

    // Return the found products
    return res.json(
      new ApiResponse(200, products, "Products retrieved successfully")
    );
  } catch (error) {
    // Handle unexpected errors
    return res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "An unexpected error occurred",
    });
  }
});

const bulkUploadProducts = asyncHandler(async (req, res) => {
  try {
    if (!req.body.products || !Array.isArray(req.body.products)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product data" });
    }

    const createdProducts = await Product.insertMany(req.body.products);

    return res.status(201).json({
      success: true,
      message: "Products uploaded successfully",
      products: createdProducts,
    });
  } catch (error) {
    console.error("Bulk upload error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});
const deleteMultipleProducts = asyncHandler(async (req, res) => {
  const { ids } = req.body; // Expecting an array of product IDs

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid request, provide an array of product IDs",
    });
  }

  // 🟢 Find products by their IDs
  const products = await Product.find({ _id: { $in: ids } });

  if (products.length !== ids.length) {
    return res.status(404).json({
      success: false,
      message: "Some products not found",
    });
  }

  // 🟢 If all products exist, delete them
  await Product.deleteMany({ _id: { $in: ids } });

  return res.json({
    success: true,
    message: "Products deleted successfully",
  });
});

export {
  deleteMultipleProducts,
  bulkUploadProducts,
  addProduct,
  getAllProducts,
  deleteProduct,
  getSingleProduct,
  updateProduct,
  searchProducts,
  approveProduct,
};
