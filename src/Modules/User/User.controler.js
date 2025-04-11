import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../../utils/asyncHandler.js";
import bcrypt from "bcrypt";
import { uploadOnCloudinary } from "../../utils/Cloudinary.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { User } from "./User.model.js";
import { ApiError } from "../../utils/ApiError.js";
import sendEmail from "../../utils/SendEmail.js";

const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Error generating tokens:", error);
    throw new ApiError(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  try {
    // Extract required and optional fields
    const { fullName, email, phone, password, username, dateOfBirth, gender } =
      req.body;

    // Validate required fields
    if ([fullName, email, phone, password].some((field) => !field?.trim())) {
      return res.status(400).json({
        statusCode: 400,
        message: "Full name, email, phone, and password are required",
      });
    }

    // Check if email or phone already exists
    const existingEmail = await User.findOne({ email });
    const existingPhone = await User.findOne({ phone });

    if (existingEmail) {
      return res.status(409).json({
        statusCode: 409,
        message: "This email is already registered. ",
      });
    }

    if (existingPhone) {
      return res.status(409).json({
        statusCode: 409,
        message: "This phone number is already registered.",
      });
    }

    // Encrypt the password before saving

    // Handle avatar upload if provided
    let avatarUrl = null;
    if (req.files?.avatar) {
      const avatarPath = req.files.avatar[0]?.path;
      if (avatarPath) {
        const uploadedAvatar = await uploadOnCloudinary(avatarPath);
        if (!uploadedAvatar) {
          return res.status(400).json({
            statusCode: 400,
            message: "Avatar upload failed",
          });
        }
        avatarUrl = uploadedAvatar.secure_url;
      }
    }

    // Create new user in the database
    const user = await User.create({
      fullName,
      email,
      phone,
      password, // Save the encrypted password
      username: username || null, // Optional
      dateOfBirth: dateOfBirth || null, // Optional
      gender: gender || null, // Optional
      avatar: avatarUrl, // Optional
    });

    // Retrieve user data without sensitive fields
    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    if (!createdUser) {
      return res.status(500).json({
        statusCode: 500,
        message: "User registration failed. Please try again later.",
      });
    }

    // Return successful response
    return res.status(201).json({
      statusCode: 201,
      message: "User registered successfully",
      data: createdUser,
    });
  } catch (error) {
    console.error("Registration Error:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "An unexpected error occurred. Please try again later.",
    });
  }
});

const loginUser = asyncHandler(async (req, res) => {
  const { emailOrPhone, password } = req.body;

  // 🔹 Find user by email or phone number
  const user = await User.findOne({
    $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
  });

  if (!user) return res.status(404).json({ message: "User not found!" });

  // 🔹 Check Password
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid)
    return res.status(401).json({ message: "Invalid credentials!" });

  // 🔹 Generate Tokens
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // 🔹 Save refresh token in DB
  user.refreshToken = refreshToken;
  await user.save();

  // 🔹 Set Cookies
  res.cookie("accessToken", accessToken, { httpOnly: true, secure: true });
  res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: true });

  // 🔹 Send Response (without password & refresh token)
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  return res.status(200).json({
    message: "User logged in successfully",
    user: loggedInUser,
    accessToken,
  });
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefereshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});
const getUserProfile = asyncHandler(async (req, res) => {
  const { id } = req.query;

  if (!id) {
    throw new ApiError(400, "User ID is required");
  }

  const user = await User.findById(id).select("-password");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "User profile fetched successfully"));
});

// Controller to update user account details
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email, mobile, username, dob, gender } = req.body;

  // Check for required fields
  if (!fullName || !email) {
    throw new ApiError(400, "Full name and email are required");
  }

  // Check if email already exists in other user's account
  const emailExists = await User.findOne({ email, _id: { $ne: req.user._id } });
  if (emailExists) {
    throw new ApiError(400, "Email already in use by another account");
  }

  // Update user details
  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
        mobile,
        username,
        dob,
        gender,
      },
    },
    { new: true, runValidators: true }
  ).select("-password");

  if (!updatedUser) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "Account details updated successfully")
    );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  //TODO: delete old image - assignment

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar image updated successfully"));
});
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select("-password -refreshToken");

  if (!users) {
    throw new ApiError(404, "No users found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, users, "All users fetched successfully"));
});
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.query;

  // Validate user ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid user ID");
  }

  // Find and delete user
  const user = await User.findByIdAndDelete(id);

  // If user not found
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Return success response
  return res
    .status(200)
    .json(new ApiResponse(200, null, "User deleted successfully"));
});
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ApiError(400, "Email is required");
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ status: "User not found" });
    }

    // Generate a reset token
    const token = jwt.sign({ id: user._id }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "1d",
    });
    const frontendUrl = req.headers.origin || "http://localhost:5174"; // Fallback URL
    // Construct the password reset link
    const resetLink = `${frontendUrl}/reset-password?id=${user._id}&token=${token}`;

    // Use the sendEmail function to send the reset email
    await sendEmail({
      email: user.email,
      subject: "Reset Password Link",
      message: `Click the link to reset your password: ${resetLink}`,
    });

    res.status(200).json({
      status: "Success",
      message: "Password reset link sent to your email",
    });
  } catch (error) {
    console.error("Error during forgot password:", error);

    if (error instanceof ApiError) {
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { id, token } = req.query;
    const { password } = req.body;

    // Verify the token
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
      if (err) {
        console.error("Error verifying token:", err);
        return res.status(400).json({ Status: "Error with token" });
      }

      // Check if the decoded token's user ID matches the provided ID
      if (decoded.id !== id) {
        return res
          .status(400)
          .json({ Status: "Invalid token for the provided user ID" });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update the user's password in the database
      try {
        await User.findByIdAndUpdate(id, {
          password: hashedPassword,
        });

        res.status(200).json({
          Status: "Success",
          message: "Password updated successfully",
        });
      } catch (err) {
        console.error("Error updating password:", err);
        res
          .status(500)
          .json({ Status: "Error", message: "Failed to update password" });
      }
    });
  } catch (error) {
    console.error("Error during reset password:", error);

    if (error instanceof ApiError) {
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  getAllUsers,
  getUserProfile,
  deleteUser,
  forgotPassword,
  resetPassword,
};
