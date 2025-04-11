import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../../utils/Cloudinary.js";
import sendEmail from "../../utils/SendEmail.js";
import { WebsiteSetting } from "./websitesetting.model.js";

export const getWebsiteSettings = async (req, res) => {
  try {
    const settings = await WebsiteSetting.findOne();

    if (!settings) {
      return res.status(404).json({ message: "Website settings not found." });
    }

    res.status(200).json(settings);
  } catch (error) {
    console.error("Error fetching website settings:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateWebsiteSettings = asyncHandler(async (req, res) => {
  try {
    if (!req.body) {
      throw new ApiError(400, "Request body is missing");
    }

    const {
      siteName,
      siteDescription,
      siteKeywords,
      contactEmail,
      contactPhone,
      contactAddress,
      supportEmail,
      supportPhone,
      socialLinks,
      seoTitle,
      seoDescription,
      seoKeywords,
      googleAnalyticsId,
      facebookPixelId,
      razorpayKey,
      razorpaySecret,
      phonePeKey,
      phonePeSecret,
      smtpConfig,
      maintenanceMode,
      termsAndConditions,
      privacyPolicy,
    } = req.body;

    let updatedData = {
      siteName,
      siteDescription,
      siteKeywords,
      contactEmail,
      contactPhone,
      contactAddress,
      supportEmail,
      supportPhone,
      seoTitle,
      seoDescription,
      seoKeywords,
      googleAnalyticsId,
      facebookPixelId,
      razorpayKey,
      razorpaySecret,
      phonePeKey,
      phonePeSecret,
      smtpConfig,
      maintenanceMode,
      termsAndConditions,
      privacyPolicy,
    };

    // ✅ Parse socialLinks if it's sent as a string
    if (socialLinks && typeof socialLinks === "string") {
      try {
        updatedData.socialLinks = JSON.parse(socialLinks);
      } catch (error) {
        throw new ApiError(400, "Invalid socialLinks format");
      }
    }
    // ✅ Parse smtpConfig if it's sent as a string
    if (smtpConfig && typeof smtpConfig === "string") {
      try {
        updatedData.smtpConfig = JSON.parse(smtpConfig);
      } catch (error) {
        throw new ApiError(400, "Invalid smtpConfig format");
      }
    }

    // Handle logo and favicon uploads
    if (req.files?.siteLogo) {
      const uploadedLogo = await uploadOnCloudinary(req.files.siteLogo[0].path);
      if (!uploadedLogo) {
        throw new ApiError(400, "Failed to upload site logo");
      }
      updatedData.siteLogo = uploadedLogo.url;
    }

    if (req.files?.favicon) {
      const uploadedFavicon = await uploadOnCloudinary(
        req.files.favicon[0].path
      );
      if (!uploadedFavicon) {
        throw new ApiError(400, "Failed to upload favicon");
      }
      updatedData.favicon = uploadedFavicon.url;
    }

    // Update the settings
    const websiteSettings = await WebsiteSetting.findOneAndUpdate(
      {},
      updatedData,
      {
        new: true,
        upsert: true, // Creates a new document if it doesn't exist
      }
    );

    res.status(200).json({
      success: true,
      message: "Website settings updated successfully",
      settings: websiteSettings,
    });
  } catch (error) {
    console.error("Error updating website settings:", error);

    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export const resetWebsiteSettings = async (req, res) => {
  try {
    if (!req.admin) {
      return res.status(403).json({ message: "Unauthorized access." });
    }

    await WebsiteSetting.deleteMany({});

    res.status(200).json({ message: "Website settings reset successfully." });
  } catch (error) {
    console.error("Error resetting website settings:", error);
    res.status(500).json({ message: "Server error" });
  }
};
export const contactFormHandler = async (req, res) => {
  try {
    const { name, email, number, message } = req.body;

   
    const websiteSettings = await WebsiteSetting.findOne();
    if (!websiteSettings) {
      return res
        .status(500)
        .json({ success: false, message: "Website settings not found" });
    }

    const contactEmail = websiteSettings.contactEmail; // Email where messages will be sent
    if (!contactEmail) {
      return res
        .status(500)
        .json({ success: false, message: "No contact email configured" });
    }

    await sendEmail({
      email: contactEmail,
      subject: `New Contact Form Submission from ${name}`,
      message: `Name: ${name}\nEmail: ${email}\nPhone: ${number}\n\nMessage: ${message}`,
    });

    res
      .status(200)
      .json({ success: true, message: "Message sent successfully" });
  } catch (error) {
    console.error("Error in contact form submission:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
