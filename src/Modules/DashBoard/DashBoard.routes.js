import { Router } from "express";
import {
    DashBoardHeaderData, DashBoardBSProductData, DashBoardRecentUserData
} from "./DashBoard.controler.js";

const router = Router();
router.route("/dashboard-header").get(DashBoardHeaderData);
router.route("/DashBoardBSProductData").get(DashBoardBSProductData);
router.route("/DashBoardRecentUserData").get(DashBoardRecentUserData);

export default router;
