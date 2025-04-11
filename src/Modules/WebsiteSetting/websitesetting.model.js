import mongoose from "mongoose";

const websiteSettingSchema = new mongoose.Schema(
  {
    siteName: { type: String, default: "My Awesome Website" }, // Default Website Name
    siteLogo: { type: String, default: "/default-logo.png" }, // Default logo path
    favicon: { type: String, default: "/default-favicon.ico" }, // Default favicon path
    siteDescription: { type: String, default: "Welcome to our website!" },
    siteKeywords: {
      type: [String],
      default: ["website", "awesome", "default"],
    },

    // Contact Details
    contactEmail: {
      type: String,
      required: true,
      default: "contact@example.com",
    },
    contactPhone: { type: String, default: "+1234567890" },
    contactAddress: { type: String, default: "123 Street, City, Country" },
    supportEmail: { type: String, default: "support@example.com" },
    supportPhone: { type: String, default: "+9876543210" },

    // Social Media Links
    socialLinks: {
      facebook: { type: String, default: "https://facebook.com/default" },
      twitter: { type: String, default: "https://twitter.com/default" },
      instagram: { type: String, default: "https://instagram.com/default" },
      linkedin: { type: String, default: "https://linkedin.com/default" },
      youtube: { type: String, default: "https://youtube.com/default" },
    },

    // SEO & Meta
    seoTitle: { type: String, default: "Default SEO Title" },
    seoDescription: {
      type: String,
      default: "This is the default SEO description.",
    },
    seoKeywords: { type: [String], default: ["seo", "default", "website"] },
    googleAnalyticsId: { type: String, default: "" },
    facebookPixelId: { type: String, default: "" },

    // Payment Integrations
    razorpayKey: { type: String, default: "" },
    razorpaySecret: { type: String, default: "" },
    phonePeKey: { type: String, default: "" },
    phonePeSecret: { type: String, default: "" },

    // Third-party integrations
    smtpConfig: {
      host: { type: String, default: "smtp.example.com" },
      port: { type: Number, default: 587 },
      username: { type: String, default: "user@example.com" },
      password: { type: String, default: "password123" },
      fromEmail: { type: String, default: "no-reply@example.com" },
    },

    // Other Settings
    maintenanceMode: { type: Boolean, default: false }, // Default off
    termsAndConditions: { type: String, default: "/terms-and-conditions" },
    privacyPolicy: { type: String, default: "/privacy-policy" },
  },
  { timestamps: true }
);

export const WebsiteSetting = mongoose.model(
  "WebsiteSetting",
  websiteSettingSchema
);
