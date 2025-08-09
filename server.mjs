import express from "express";
import connectDB from "./connections/mongoConnect.mjs";
import { configDotenv } from "dotenv";
import mongoose from "mongoose";
import corsOptions from "./config/cors/corsOptions.mjs";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import uploadRouter from "./routes/admin/upload.router.mjs";
import authRouter from "./routes/admin/auth.router.mjs";
import roleRouter from "./routes/admin/role.router.mjs";
import adminRouter from "./routes/admin/admins.router.mjs";
import categoryRouter from "./routes/admin/category.router.mjs";
import brandRouter from "./routes/admin/brands.router.mjs";
import productsRouter from "./routes/admin/products.routes.mjs";
import variantRouter from "./routes/admin/variants.router.mjs";
import blogsRouter from "./routes/admin/blogs.router.mjs";
import reviewRouter from "./routes/admin/reviews.routes.mjs";
import productTypeRouter from "./routes/admin/productType.router.mjs";
import ordersRouter from "./routes/admin/orders.router.mjs";
import retursRouter from "./routes/admin/returns.router.mjs";
import userRouter from "./routes/admin/users.router.mjs";
import offerRouter from "./routes/admin/offers.router.mjs";
import router from "./routes/index.mjs";

const app = express();

configDotenv();
connectDB(process.env.DATABASE_URI);

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan("dev"));
app.use(cookieParser());

app.use("/", router);

mongoose.connection.once("open", () => {
  app.listen(process.env.PORT, () =>
    console.log(`🌎 - Listening On http://localhost:${process.env.PORT} -🌎`)
  );
});

export default app;