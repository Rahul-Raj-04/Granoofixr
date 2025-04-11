import { asyncHandler } from "../../utils/asyncHandler.js";
import connectDB from "../../db/index.js";
import { Admin } from "./Admin.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import sendEmail from "../../utils/SendEmail.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const initializeAdmin = asyncHandler(async (req, res) => {
  try {
    await connectDB();
    const admin = await Admin.findOne({ isAdmin: true });

    if (!admin) {
      const adminuser = new Admin({
        username: "admin",
        password: "admin@1234",
        email: "admin@gmail.com",
        profilePhoto:
          "https://themesbrand.com/velzon/html/master/assets/images/users/avatar-1.jpg",
      });
      await adminuser.save();
      console.log("admin created");
    } else {
      console.log("admin already exists");
    }
  } catch (error) {
    throw new ApiError(500, "Database connection failed", error.message);
  }
});

//login admin controler
const loginAdmin = async (req, res) => {
  const generateAccessAndRefereshTokens = async (userId) => {
    try {
      const admin = await Admin.findById(userId);
      const accessToken = admin.generateAccessToken();
      const refreshToken = admin.generateRefreshToken();

      admin.refreshToken = refreshToken;
      admin.loginTime = new Date();
      await admin.save({ validateBeforeSave: false });

      return { accessToken, refreshToken };
    } catch (error) {
      throw new ApiError(
        500,
        "Something went wrong while generating refresh and access token"
      );
    }
  };

  try {
    const { email, username, password } = req.body;

    if (!username && !email) {
      throw new ApiError(400, "Username or email is required");
    }

    // Find the user by username or email
    const admin = await Admin.findOne({ $or: [{ username }, { email }] });

    if (!admin) {
      throw new ApiError(404, "Admin does not exist");
    }

    // Check if user status is true

    // Validate password
    const isPasswordValid = await admin.isPasswordCorrect(password);

    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid  credentials");
    }

    // Generate access and refresh tokens
    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
      admin._id
    );

    // Fetch logged-in user data (excluding password and refreshToken)
    const loggedInUser = await Admin.findById(admin._id).select(
      "-password -refreshToken"
    );
    admin.loginstatus = true;
    await admin.save({ validateBeforeSave: false });
    // Set options for cookies
    const options = {
      httpOnly: true,
      secure: true,
    };

    // Send response with cookies and logged-in user data
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { user: loggedInUser, accessToken, refreshToken },
          "User logged in successfully"
        )
      );
  } catch (error) {
    console.error("Error during login:", error);

    // Handle specific errors
    if (error instanceof ApiError) {
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }

    // Handle other unexpected errors
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const logoutAdmin = async (req, res) => {
  try {
    // Assuming you have the admin ID available in the request body or query parameters
    const adminId = req.body.adminId || req.query.adminId; // Modify this according to how the admin ID is sent in your request

    if (!adminId) {
      throw new ApiError(400, "Admin ID is required");
    }

    // Find the admin by ID
    const admin = await Admin.findById(adminId);

    if (!admin) {
      throw new ApiError(404, "Admin not found");
    }

    // Set login status to false
    admin.loginstatus = false;
    await admin.save({ validateBeforeSave: false });

    // Clear cookies (optional)
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    return res
      .status(200)
      .json({ success: true, message: "Admin logged out successfully" });
  } catch (error) {
    console.error("Error during logout:", error);

    // Handle specific errors
    if (error instanceof ApiError) {
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }

    // Handle other unexpected errors
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
const getAdminDetails = async (req, res) => {
  connectDB();
  try {
    const adminId = req.query.adminId; // Extract adminId from query params
    if (!adminId) {
      throw new ApiError(400, "Admin ID is required in query params");
    }

    // Fetch admin details from the database based on the adminId
    const admin = await Admin.findById(adminId);

    if (!admin) {
      throw new ApiError(404, "Admin not found");
    }

    const adminDetails = {
      firstName: admin.firstName || "", // If firstName is null or undefined, assign an empty string
      lastName: admin.lastName || "",
      phoneNumber: admin.phoneNumber || "",
      email: admin.email || "",
      loginTime: admin.loginTime || null, // You can set a default value for dates as needed
      designation: admin.designation || "",
      website: admin.website || "",
      city: admin.city || "",
      state: admin.state || "",
      postalCode: admin.postalCode || "",
      address: admin.address || "",
      username: admin.username || "",
      profilePhoto: admin.profilePhoto || "",
      portfolioLink: admin.portfolioLink || "",
      loginHistory: admin.loginHistory || [],
      isAdmin: admin.isAdmin,
    };

    // Send admin details in the response
    res.json(
      new ApiResponse(200, adminDetails, "Admin details retrieved successfully")
    );
  } catch (error) {
    console.error("Error fetching admin details:", error);

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
const updateAdmin = async (req, res) => {
  const {
    adminId,
    firstName,
    lastName,
    phoneNumber,
    email,
    designation,
    website,
    city,
    state, // Ensure this is included
    address, // Ensure this is included
    postalCode,
    username,
    profilePhoto,
    portfolioLink,
  } = req.body;

  try {
    if (!adminId) {
      return res.status(400).json({ error: "admin id are required" });
    }

    const admin = await Admin.findByIdAndUpdate(
      adminId,
      {
        $set: {
          firstName,
          lastName,
          phoneNumber,
          email,
          designation,
          website,
          city,
          state, // Ensure this is included
          address, // Ensure this is included
          postalCode,
          username,
          profilePhoto,
          portfolioLink,
        },
      },
      { new: true }
    ).select("-password");

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    return res
      .status(200)
      .json({ message: "Account details updated successfully", admin });
  } catch (error) {
    console.error("Error updating account details:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
const changeAdminPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!req.admin) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized access" });
  }

  try {
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin account not found" });
    }

    const isPasswordCorrect = await admin.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
      return res
        .status(400)
        .json({ success: false, message: "Incorrect Current password" });
    }

    admin.password = newPassword;
    await admin.save({ validateBeforeSave: false });

    return res
      .status(200)
      .json({ success: true, message: "Password updated successfully!" });
  } catch (error) {
    console.error("Error changing admin password:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
});

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ApiError(400, "Email is required");
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ status: "Admin not found" });
    }

    // Generate a reset token
    const token = jwt.sign({ id: admin._id }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "1d",
    });
    const frontendUrl = req.headers.origin || "http://localhost:5174"; // Fallback URL
    // Construct the password reset link
    const resetLink = `${frontendUrl}/Reset-password?id=${admin._id}&token=${token}`;

    // Use the sendEmail function to send the reset email
    await sendEmail({
      email: admin.email,
      subject: `"Reset Password Link"`,
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

      // Update the user's password and role in the database
      try {
        await Admin.findByIdAndUpdate(id, {
          password: hashedPassword,
          role: "admin", // Change the user to an admin
        });

        res.status(200).json({
          Status: "Success",
          message: "Password updated successfully, user is now an admin",
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
  loginAdmin,
  logoutAdmin,
  getAdminDetails,
  updateAdmin,
  changeAdminPassword,
  initializeAdmin,
  forgotPassword,
  resetPassword,
};
