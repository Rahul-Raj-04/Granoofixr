import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../../utils/Cloudinary.js";
import { Banner } from "./Banner.modal.js";

export const addBanner = async (req, res) => {
  try {
    if (!req.body) {
      throw new ApiError(400, "Request body is missing or empty");
    }

    // Extracting fields from request body
    const { title, subtitle, link, isActive, displayOrder, place, type } = req.body;

    // ✅ Validate Title
    if (!title || title.trim() === "") {
      throw new ApiError(400, "Title is required");
    }

    // ✅ Validate Image
    if (!req.files?.image) {
      throw new ApiError(400, "Image is required");
    }

    // ✅ Validate `type`
    if (!["slider", "normal"].includes(type)) {
      throw new ApiError(400, "Invalid type. Allowed values: 'slider' or 'normal'");
    }

    // ✅ Upload Image to Cloudinary
    const imageLocalPath = req.files.image[0].path;
    const uploadedImage = await uploadOnCloudinary(imageLocalPath);
    if (!uploadedImage) {
      throw new ApiError(400, "Failed to upload image");
    }

    // ✅ Create banner object
    const banner = await Banner.create({
      title,
      subtitle,
      imageUrl: uploadedImage.url,
      link,
      isActive,
      displayOrder,
      place,
      type,
    });

    // ✅ Send Success Response
    return res.status(201).json(new ApiResponse(201, banner, "Banner created successfully"));

  } catch (error) {
    console.error("❌ Error adding banner:", error);

    // ✅ Handle Mongoose Validation Errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ success: false, message: errors.join(", ") });
    }

    // ✅ If error is already an instance of `ApiError`
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    // ✅ Handle Unknown Errors
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getAllBanners = async (req, res) => {
  try {
    // Extract filters from query parameters
    const { type, place, isActive } = req.query;

    // Build query object dynamically
    let query = {};
    if (type) query.type = type;
    if (place) query.place = place;
    if (isActive !== undefined) query.isActive = isActive === "true";

    // Fetch banners based on query
    const banners = await Banner.find(query).sort({ displayOrder: 1 });

    return res
      .status(200)
      .json(new ApiResponse(200, banners, "Banners retrieved successfully"));
  } catch (error) {
    console.error("Error fetching banners:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
export const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if banner exists
    const banner = await Banner.findById(id);
    if (!banner) {
      throw new ApiError(404, "Banner not found");
    }

    // Delete the banner
    await Banner.findByIdAndDelete(id);

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Banner deleted successfully"));
  } catch (error) {
    console.error("Error deleting banner:", error);

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
  
export const editBanner = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "Banner ID is required" });
    }

    const banner = await Banner.findById(id);
    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    // Optional fields to update
    const { title, subtitle, link, type, isActive, displayOrder, place } = req.body;

    if (title) banner.title = title;
    if (subtitle) banner.subtitle = subtitle;
    if (link) banner.link = link;
    if (type) banner.type = type;
    if (place) banner.place = place;
    if (typeof isActive !== "undefined") banner.isActive = isActive === "true" || isActive === true;
    if (displayOrder) banner.displayOrder = Number(displayOrder);

    // ✅ Handle image upload from form-data
    if (req.files && req.files.image) {
      const imageLocalPath = req.files.image[0].path;
      const uploadedImage = await uploadOnCloudinary(imageLocalPath);
      if (!uploadedImage) {
        throw new Error("Failed to upload image");
      }
      banner.imageUrl = uploadedImage.url;
    }

    await banner.save();

    return res.json({
      success: true,
      data: banner,
      message: "Banner updated successfully",
    });
  } catch (error) {
    console.error("❌ Error during banner edit:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};



