import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
const { Schema } = mongoose;
const adminSchema = new Schema(
  {
    firstName: { type: String },
    lastName: { type: String },
    phoneNumber: { type: String },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    loginTime: { type: Date },
    designation: { type: String },
    website: { type: String },
    city: { type: String },
    state: { type: String },
    address: { type: String },
    postalCode: { type: String },
    username: { type: String, required: true, unique: true },
    profilePhoto: { type: String },
    portfolioLink: { type: String },
    loginHistory: [{ type: Date }],
    isAdmin: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});
adminSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};
adminSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};
adminSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

// Create Admin Model
export const Admin = mongoose.model("Admin", adminSchema);
