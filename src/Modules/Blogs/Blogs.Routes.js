import { Router } from "express";
import {
  addBlog,
  deleteBlog,
  getAllBlogs,
  getBlogById,
} from "./Blog.controlr.js";
import { upload } from "../../middlewares/FileUpload.middlwares.js";

const router = Router();

router.route("/add").post(
  upload.fields([
    {
      name: "images",
      maxCount: 20,
    },
  ]),
  addBlog
);
router.route("/").get(getAllBlogs);
router.route("/single").get(getBlogById);
router.route("/delete").delete(deleteBlog);

export default router;
