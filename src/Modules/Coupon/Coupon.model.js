import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    status: { type: String, default: "active" },
    used: { type: Number, default: 0 },
    discountType: {
      type: String,
      enum: ["Fixed Price", "Percent Price"],
      required: true,
    },
    price: {
      type: Number,
      required: function () {
        return this.discountType === "Fixed Price";
      },
    },
    percent: {
      type: Number,
      required: function () {
        return this.discountType === "Percent Price";
      },
    },
    minimumAmount: { type: Number, required: true },
    publish: {
      type: String,
      enum: ["Now", "Later"],
      required: true,
    },
    publishDate: {
      type: Date,
      required: function () {
        return this.publish === "Later";
      },
    },
  },
  {
    timestamps: true, // Add timestamps to the schema
  }
);

export const Coupon = mongoose.model("Coupon", couponSchema);
