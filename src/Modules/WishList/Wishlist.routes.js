import { Router } from "express";
import {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} from "./Wishlist.controler.js";
import { verifyJWT } from "../../middlewares/auth.middlwares.js";

const router = Router();

router.route("/add").post(verifyJWT, addToWishlist);
router.route("/").get(verifyJWT, getWishlist);
router.route("/remove").delete(verifyJWT, removeFromWishlist);

export default router;
