import { Router } from "express";
import { addToCart, getCart, removeFromCart } from "./Cart.controler.js";
import { verifyJWT } from "../../middlewares/auth.middlwares.js";

const router = Router();
router.route("/add").post(verifyJWT, addToCart);
router.route("/product").get(verifyJWT, getCart);
router.route("/removeproduct").delete(verifyJWT, removeFromCart);
export default router;
