import { Router } from "express";

import {
  createCategoriesInBulk,
  createCategory,
  deleteCategory,
  deletemultipleCategory,
  editCategory,
  getAllCategories,
} from "./Category.controler.js";
import { upload } from "../../middlewares/FileUpload.middlwares.js";

const router = Router();
router.route("/add").post(
  upload.fields([
    {
      name: "image",
      maxCount: 1,
    },
  ]),
  createCategory
);
router.route("/bulk-upload").post(
  upload.fields([
    {
      name: "image",
      maxCount: 1,
    },
  ]),
  createCategoriesInBulk
);
router.route("/delete").delete(deleteCategory);
router.route("/multiple-delete").delete(deletemultipleCategory);
router.route("/allcategory").get(getAllCategories);
router.route("/update/:id").patch(
  upload.fields([
    {
      name: "image",
      maxCount: 1,
    },
  ]),
  editCategory
);
export default router;
