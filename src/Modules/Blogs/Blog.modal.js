import mongoose from "mongoose";

const blogSchema = new mongoose.Schema({
  metaTitle: {
    type: String,
   
    trim: true,
  },
  metaDescription: {
    type: String,
    
    trim: true,
  },
  metakeywords: {
    type: [String], 
    default: [],
  },

  sections: [
    {
      type: {
        type: String,
        enum: ["title", "paragraph", "list", "image"],
        required: true,
      },
      content: { type: mongoose.Schema.Types.Mixed, required: true },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

export const Blog = mongoose.model("Blog", blogSchema);
