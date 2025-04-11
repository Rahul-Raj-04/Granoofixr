import { Coupon } from "./Coupon.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const createCoupon = asyncHandler(async (req, res) => {
  try {
    const {
      name,
      code,
      start,
      end,
      discountType,
      price,
      percent,
      minimumAmount,
      publish,
      publishDate,
    } = req.body;

    // Validate required fields
    if (!name || !code || !start || !end || !discountType || !minimumAmount || !publish) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // Convert date strings to Date objects
    const startDate = new Date(start);
    const endDate = new Date(end);
    const publishDateObj = publish === "Later" ? new Date(publishDate) : null;

    // Validate date conversion
    if (isNaN(startDate) || isNaN(endDate) || (publish === "Later" && isNaN(publishDateObj))) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD.",
      });
    }

    // Check if coupon with the same code already exists
    const existingCoupon = await Coupon.findOne({ code });
    if (existingCoupon) {
      return res.status(409).json({
        success: false,
        message: "Coupon with the same code already exists",
      });
    }

    // Prepare coupon data
    const couponData = {
      name,
      code,
      start: startDate,
      end: endDate,
      discountType,
      minimumAmount,
      publish,
      publishDate: publishDateObj,
      used: 0,
    };

    // Add discount based on type
    if (discountType === "Fixed Price") {
      if (!price) {
        return res.status(400).json({
          success: false,
          message: "Price is required for Fixed Price discount",
        });
      }
      couponData.price = price;
    } else if (discountType === "Percent Price") {
      if (!percent) {
        return res.status(400).json({
          success: false,
          message: "Percent is required for Percent Price discount",
        });
      }
      couponData.percent = percent;
    }

    // Create the coupon
    const coupon = await Coupon.create(couponData);

    return res.status(201).json({
      success: true,
      data: coupon,
      message: "Coupon created successfully",
    });
  } catch (error) {
    console.error("Error creating coupon:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

const deleteCoupon = asyncHandler(async (req, res) => {
  const { id } = req.query;

  // Check if coupon exists
  const coupon = await Coupon.findById(id);
  if (!coupon) {
    throw new ApiError(404, "Coupon not found");
  }

  // Delete the coupon
  await Coupon.findByIdAndDelete(id);

  return res.json({
    success: true,
    message: "Coupon deleted successfully",
  });
});

const getCoupons = asyncHandler(async (req, res) => {
  // Fetch all coupons
  const coupons = await Coupon.find();

  return res.json({
    success: true,
    data: coupons,
  });
});
const editCoupon = asyncHandler(async (req, res) => {
  // Get coupon details from frontend
  const { id, title, code, numberOfTimes, discount, status } = req.body;

  // Validation - Check if required fields are not empty
  if (![id, title, code, discount].every((field) => field)) {
    throw new ApiError(400, "ID, title, code, and discount are required");
  }

  // Find the coupon by ID
  const existingCoupon = await Coupon.findById(id);

  if (!existingCoupon) {
    throw new ApiError(404, "Coupon not found");
  }

  // Update coupon details
  existingCoupon.title = title;
  existingCoupon.code = code;
  existingCoupon.numberOfTimes = numberOfTimes;
  existingCoupon.discount = discount;
  existingCoupon.status = status || "active";

  // Save the updated coupon
  const updatedCoupon = await existingCoupon.save();

  // Check for coupon update
  if (!updatedCoupon) {
    throw new ApiError(500, "Something went wrong while updating the coupon");
  }

  return res.status(200).json({
    success: true,
    data: updatedCoupon,
    message: "Coupon updated successfully",
  });
});

export { createCoupon, deleteCoupon, getCoupons, editCoupon };
