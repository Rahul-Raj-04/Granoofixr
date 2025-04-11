import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category", // Reference to the Category model
      required: true,
    },
    sku: {
      type: String,
      unique: true,
      trim: true,
    },
    quantity: {
      type: Number,
      min: 0,
    },
    stock: {
      type: Number,
      min: 0,
    },
    discountType: {
      type: String,
      enum: ["noDiscount", "fixedDiscount", "percentDiscount"],
      default: "noDiscount",
    },
    discountPrice: {
      type: Number,
      min: 0,
    },
    discountPercent: {
      type: Number,
      min: 0,
      max: 100,
    },
    shipping_cost: {
      type: Number,
      min: 0,
    },
    image: [
      {
        type: String,
        trim: true,
      },
    ],
    size: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      trim: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { timestamps: true }
);

export const Product = mongoose.model("Product", productSchema);
