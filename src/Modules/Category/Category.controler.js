import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../../utils/Cloudinary.js";
import { Product } from "../Product/Product.models.js";
import { Category } from "./Category.model.js";

const createCategory = async (req, res) => {
  try {
    if (!req.body) {
      throw new ApiError(400, "Request body is missing or empty");
    }

    const { name, slug, parent, description, isCreateAsParentCategory } =
      req.body;

    // Validate required fields
    if (![name, slug].every((field) => field?.trim())) {
      throw new ApiError(400, "Name and slug are required");
    }

    // Check if category with same slug exists
    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      throw new ApiError(409, "Category with the same slug already exists");
    }

    // Validate parent category (if provided)
    let parentCategory = null;
    if (parent) {
      parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        throw new ApiError(400, "Invalid parent category ID");
      }
    }

    // Handle image upload (if provided)
    let imageUrl = null;
    if (req.files?.image) {
      const imageLocalPath = req.files.image[0].path;
      const uploadedImage = await uploadOnCloudinary(imageLocalPath);
      if (!uploadedImage) {
        throw new ApiError(400, "Failed to upload image");
      }
      imageUrl = uploadedImage.url;
    }

    // Create new category
    const category = await Category.create({
      name,
      slug,
      parent: parentCategory ? parentCategory._id : null,
      description,
      isCreateAsParentCategory,
      image: imageUrl, // Image URL स्टोर कर रहे हैं
    });

    return res
      .status(201)
      .json(new ApiResponse(201, category, "Category created successfully"));
  } catch (error) {
    console.error("Error during category creation:", error);

    if (error instanceof ApiError) {
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }

    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
const createCategoriesInBulk = async (req, res) => {
  try {
    if (!req.body || !Array.isArray(req.body.categories)) {
      throw new ApiError(
        400,
        "Request body must contain an array of categories"
      );
    }

    const categoriesData = req.body.categories;

    // Validate each category
    for (const category of categoriesData) {
      if (!category.name || !category.slug) {
        throw new ApiError(400, "Each category must have a name and slug");
      }

      // Check if category with the same slug exists
      const existingCategory = await Category.findOne({ slug: category.slug });
      if (existingCategory) {
        throw new ApiError(
          409,
          `Category with slug '${category.slug}' already exists`
        );
      }
    }

    // Process categories and upload images (if any)
    const categoriesToInsert = await Promise.all(
      categoriesData.map(async (category) => {
        let parentCategory = null;
        if (category.parent) {
          parentCategory = await Category.findById(category.parent);
          if (!parentCategory) {
            throw new ApiError(
              400,
              `Invalid parent category ID: ${category.parent}`
            );
          }
        }

        // Handle image upload
        let imageUrl = null;
        if (category.image) {
          const uploadedImage = await uploadOnCloudinary(category.image);
          if (!uploadedImage) {
            throw new ApiError(
              400,
              `Failed to upload image for category: ${category.name}`
            );
          }
          imageUrl = uploadedImage.url;
        }

        return {
          name: category.name,
          slug: category.slug,
          parent: parentCategory ? parentCategory._id : null,
          description: category.description || "",
          isCreateAsParentCategory: category.isCreateAsParentCategory || false,
          image: imageUrl,
        };
      })
    );

    // Insert categories into the database
    const insertedCategories = await Category.insertMany(categoriesToInsert);

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          insertedCategories,
          "Categories uploaded successfully"
        )
      );
  } catch (error) {
    console.error("Error during bulk category upload:", error);

    if (error instanceof ApiError) {
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }

    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};


const editCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "Category ID is required" });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    // Optional fields to update
    const { name, slug, description, parent, isCreateAsParentCategory } = req.body;

    if (name) category.name = name;
    if (slug) {
      const existingCategory = await Category.findOne({ slug, _id: { $ne: id } });
      if (existingCategory) {
        return res.status(409).json({ success: false, message: "Slug already exists for another category" });
      }
      category.slug = slug;
    }
    if (description) category.description = description;

    if (typeof isCreateAsParentCategory !== "undefined") {
      category.isCreateAsParentCategory = isCreateAsParentCategory === "true" || isCreateAsParentCategory === true;
    }

    // Optional parent
    if (parent) {
      const parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        return res.status(400).json({ success: false, message: "Invalid parent category ID" });
      }
      category.parent = parentCategory._id;
    }

    // ✅ Handle image upload from form-data
    if (req.files && req.files.image) {
      const imageLocalPath = req.files.image[0].path;
      const uploadedImage = await uploadOnCloudinary(imageLocalPath);
      if (!uploadedImage) {
        throw new Error("Failed to upload image");
      }
      category.image = uploadedImage.url;
    }

    await category.save();

    return res.json({
      success: true,
      data: category,
      message: "Category updated successfully",
    });
  } catch (error) {
    console.error("❌ Error during category update:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};


const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.query;

  // Check if category exists
  const category = await Category.findById(id);
  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Category not found",
    });
  }

  // Check if products are associated with this category ID
  const productsWithCategory = await Product.find({ "category._id": id });

  if (productsWithCategory.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Category cannot be deleted as it has associated products",
    });
  }

  // Delete the category
  await Category.findByIdAndDelete(id);

  return res.json({
    success: true,
    message: "Category deleted successfully",
  });
});

const getAllCategories = asyncHandler(async (req, res) => {
  try {
    const categories = await Category.find().lean(); // Fetch all categories

    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});
const deletemultipleCategory = asyncHandler(async (req, res) => {
  const { ids } = req.body; // Expecting an array of category IDs

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid request, provide an array of category IDs",
    });
  }

  // 🟢 Find categories by their IDs
  const categories = await Category.find({ _id: { $in: ids } });

  if (categories.length !== ids.length) {
    return res.status(404).json({
      success: false,
      message: "Some categories not found",
    });
  }

  // 🟢 Check if any of these categories are associated with products
  const productsWithCategories = await Product.find({ "category._id": { $in: ids } });

  if (productsWithCategories.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Some categories cannot be deleted as they have associated products. Remove or update those products first.",
    });
  }

  // 🟢 If no associations found, delete all selected categories
  await Category.deleteMany({ _id: { $in: ids } });

  return res.json({
    success: true,
    message: "Categories deleted successfully",
  });
});

export {
  createCategory,
  deleteCategory,
  editCategory,
  getAllCategories,
  createCategoriesInBulk,
  deletemultipleCategory,
};
