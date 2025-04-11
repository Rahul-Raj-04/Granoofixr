import { uploadOnCloudinary } from "../../utils/Cloudinary.js";
import { Blog } from "./Blog.modal.js";

export const addBlog = async (req, res) => {
  try {
    let { sections, metaTitle, metaDescription, metaTags } = req.body;

    // ✅ Parse sections if sent as JSON string (common in multipart/form-data)
    if (typeof sections === "string") {
      try {
        sections = JSON.parse(sections);
      } catch (err) {
        return res.status(400).json({ message: "Invalid JSON in sections" });
      }
    }

    // ✅ Validate sections is an array
    if (!Array.isArray(sections)) {
      return res.status(400).json({ message: "Sections should be an array" });
    }

    console.log("📌 Parsed Sections:", sections);

    // ✅ Handle image uploads
    let uploadedImages = [];

    if (req.files?.images) {
      const imageFiles = Array.isArray(req.files.images)
        ? req.files.images
        : [req.files.images];

      console.log("📌 Received Image Files:", imageFiles);

      uploadedImages = await Promise.all(
        imageFiles.map(async (file) => {
          const uploadResponse = await uploadOnCloudinary(file.path);
          console.log("📌 Uploaded to Cloudinary:", uploadResponse);
          return uploadResponse.secure_url;
        })
      );
    }

    // ✅ Inject uploaded image URLs into their corresponding section
    let imageIndex = 0;
    sections = sections.map((section) => {
      if (section.type === "image") {
        if (Array.isArray(section.content)) {
          section.content = uploadedImages.slice(
            imageIndex,
            imageIndex + section.content.length
          );
          imageIndex += section.content.length;
        } else {
          section.content = uploadedImages[imageIndex++] || null;
        }
      }
      return section;
    });

    

    // ✅ Build blogData object
    const blogData = {
      sections,
    };

    if (metaTitle) blogData.metaTitle = metaTitle;
    if (metaDescription) blogData.metaDescription = metaDescription;

    if (req.body.metakeywords) {
      try {
        blogData.metakeywords = JSON.parse(req.body.metakeywords);
      } catch (err) {
        blogData.metakeywords = Array.isArray(req.body.metakeywords)
          ? req.body.metakeywords
          : [req.body.metakeywords];
      }
    }
    

    // ✅ Save to DB
    const newBlog = await Blog.create(blogData);

   

    res.status(201).json({
      message: "Blog added successfully",
      blog: newBlog,
    });
  } catch (error) {
   
    res.status(500).json({ message: "Internal Server Error" });
  }
};
export const getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find();
    res.status(200).json({ success: true, blogs });
  } catch (error) {
    console.error("❌ Error fetching blogs:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getBlogById = async (req, res) => {
  try {
    const { id } = req.query;
    const blog = await Blog.findById(id);

    if (!blog) {
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });
    }

    res.status(200).json({ success: true, blog });
  } catch (error) {
    console.error("❌ Error fetching blog by ID:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const deleteBlog = async (req, res) => {
  try {
    const { id } = req.query; // Extract ID from query params

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Blog ID is required" });
    }

    const deletedBlog = await Blog.findByIdAndDelete(id);

    if (!deletedBlog) {
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Blog deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting blog:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
