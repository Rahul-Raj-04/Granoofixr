import { Router } from "express";
import {
  addBlog,
  deleteBlog,
  editBlog,
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
router.route("/edit").patch(
  upload.fields([
    {
      name: "images",
      maxCount: 20,
    },
  ]),
  editBlog
);
router.route("/").get(getAllBlogs);
router.route("/single").get(getBlogById);
router.route("/delete").delete(deleteBlog);

export default router;
