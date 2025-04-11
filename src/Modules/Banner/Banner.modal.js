import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subtitle: {
      type: String,
      trim: true,
      default: "",
    },
    imageUrl: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    place: {
      type: String,

      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["slider", "normal"], // Only allow these two values
      default: "normal",
    },
  },
  {
    timestamps: true,
  }
);

export const Banner =
  mongoose.models.Banner || mongoose.model("Banner", bannerSchema);
