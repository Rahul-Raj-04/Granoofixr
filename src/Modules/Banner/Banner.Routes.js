import { Router } from "express";
import {
  addBanner,
  deleteBanner,
  editBanner,
  getAllBanners,
  
} from "./Banner.controler.js";
import { upload } from "../../middlewares/FileUpload.middlwares.js";

const router = Router();
router.route("/add").post(
  upload.fields([
    {
      name: "image",
      maxCount: 1,
    },
  ]),
  addBanner
);
router.route("/").get(getAllBanners);
router.route("/delete/:id").delete(deleteBanner);
router.route("/edit/:id").patch(
  upload.fields([
    {
      name: "image",
      maxCount: 1,
    },
  ]),
  editBanner
);
export default router;
