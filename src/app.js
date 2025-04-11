import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Routes import

import adminrouter from "../src/Modules/Admin/Admin.routes.js";
import userrouter from "../src/Modules/User/user.routes.js";
import coupon from "../src/Modules/Coupon/coupon.routes.js";
import category from "../src/Modules/Category/Category.routes.js";
import Product from "../src/Modules/Product/Product.routes.js";
import cart from "../src/Modules/Cart/cart.routes.js";
import wishlist from "../src/Modules/WishList/Wishlist.routes.js";
import Order from "../src/Modules/Orders/Order.routes.js";
import transaction from "../src/Modules/Transactions/Transaction.routes.js";
import website from "../src/Modules/WebsiteSetting/website.routes.js";
import dashboard from "../src/Modules/DashBoard/DashBoard.routes.js";
import blog from "../src/Modules/Blogs/Blogs.Routes.js";
import banner from "../src/Modules/Banner/Banner.Routes.js";

//routes declearetion
app.use("/api/v1/admin", adminrouter);
app.use("/api/v1/user", userrouter);
app.use("/api/v1/coupon", coupon);
app.use("/api/v1/category", category);
app.use("/api/v1/Product", Product);
app.use("/api/v1/cart", cart);
app.use("/api/v1/wishlist", wishlist);
app.use("/api/v1/order", Order);
app.use("/api/v1/transaction", transaction);
app.use("/api/v1/website", website);
app.use("/api/v1/dashboard", dashboard);
app.use("/api/v1/blog", blog);
app.use("/api/v1/banner", banner);

export { app };
