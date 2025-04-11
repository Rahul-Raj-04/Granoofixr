import { Router } from "express";
import {
  changeAdminPassword,
  forgotPassword,
  getAdminDetails,
  loginAdmin,
  logoutAdmin,
  resetPassword,
  updateAdmin,
} from "./Admin.controler.js";

import { adminVerifyJWT } from "../../middlewares/adminVerifyJWT.js";

const router = Router();

router.route("/login").post(loginAdmin);
router.route("/logout").post(logoutAdmin);
router.route("/Profile").get(getAdminDetails);
router.route("/update").patch(updateAdmin);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password").post(resetPassword);
router.route("/change-password").post(adminVerifyJWT, changeAdminPassword);

export default router;
