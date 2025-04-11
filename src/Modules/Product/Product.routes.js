import { Router } from "express";

import { upload } from "../../middlewares/FileUpload.middlwares.js";
import {
  addProduct,
  approveProduct,
  bulkUploadProducts,
  deleteMultipleProducts,
  deleteProduct,
  getAllProducts,
  getSingleProduct,
  searchProducts,
  updateProduct,
} from "./product.controler.js";

import { adminVerifyJWT } from "../../middlewares/adminVerifyJWT.js";

const router = Router();

router.route("/add").post(
  upload.fields([
    {
      name: "image",
      maxCount: 20,
    },
  ]),
  adminVerifyJWT,
  addProduct
);
router.route("/bulk-upload").post(
  upload.fields([
    {
      name: "image",
      maxCount: 20,
    },
  ]),
  bulkUploadProducts
);
router.route("/products").get(getAllProducts);
router.route("/product").get(getSingleProduct);
router.route("/delete").delete(deleteProduct);
router.route("/multiple-delete").delete(deleteMultipleProducts);
router.route("/update").patch(
  upload.fields([
    {
      name: "image",
      maxCount: 20,
    },
  ]),
  updateProduct
);
router.route("/searchproduct").get(searchProducts);
router.route("/Aprove").patch(approveProduct);

export default router;
