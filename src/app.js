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
import blog from "../src/Modules/Blogs/Blogs.Routes.js";
import banner from "../src/Modules/Banner/Banner.Routes.js";

//routes declearetion
app.use("/api/v1/admin", adminrouter);
app.use("/api/v1/blog", blog);
app.use("/api/v1/banner", banner);

export { app };
