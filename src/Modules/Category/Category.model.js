import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category", // Self-referencing for parent-child categories
      default: null, // Top-level categories have no parent
    },
    description: {
      type: String,
      trim: true,
    },

    isCreateAsParentCategory: {
      type: Boolean,
      default: false,
    },
    image: {
      type: String, // URL स्टोर करने के लिए
      default: null, // अगर इमेज अपलोड न हो तो NULL रहे
    },
  },
  {
    timestamps: true,
  }
);

export const Category = mongoose.model("Category", categorySchema);
