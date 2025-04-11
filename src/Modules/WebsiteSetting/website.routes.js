import { Router } from "express";
import {
  contactFormHandler,
  getWebsiteSettings,
  resetWebsiteSettings,
  updateWebsiteSettings,
} from "./website.controler.js";
import { adminVerifyJWT } from "../../middlewares/adminVerifyJWT.js";
import { upload } from "../../middlewares/FileUpload.middlwares.js";

const router = Router();
router.route("/").get(getWebsiteSettings);
router.route("/sendform").post(contactFormHandler);
router.route("/update").patch(
  adminVerifyJWT,
  upload.fields([
    { name: "siteLogo", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
  ]),
  updateWebsiteSettings
);
router.route("/reset").delete(adminVerifyJWT, resetWebsiteSettings);

export default router;
