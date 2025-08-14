import { Router } from "express";
import authRouter from "./auth.router.mjs";
import uploadRouter from "./upload.router.mjs";
import productsRouter from "./products.router.mjs";
import cartRouter from "./cart.router.mjs";
import wishlistRouter from "./wishlist.router.mjs";
import addressRouter from "./address.router.mjs";
import ordersRouter from "./orders.router.mjs";
import returnRouter from "./returns.router.mjs";
import brandRouter from "./brands.router.mjs";
import categoriesRouter from "./categories.router.mjs";
import reviewsRouter from "./reviews.router.mjs";
import heroBannerRouter from "./heroBanner.router.mjs";
import OfferRouter from "./offers.router.mjs";

const userRouter = Router()

userRouter.use("/auth", authRouter);
userRouter.use("/upload", uploadRouter);
userRouter.use("/products", productsRouter);
userRouter.use("/cart", cartRouter);
userRouter.use("/wishlist", wishlistRouter);
userRouter.use("/addresses", addressRouter);
userRouter.use("/orders", ordersRouter);
userRouter.use("/returns", returnRouter);
userRouter.use("/brands", brandRouter);
userRouter.use("/hero-banners", heroBannerRouter);
userRouter.use("/limited-time-offers", OfferRouter);
userRouter.use("/categories", categoriesRouter);
userRouter.use("/reviews", reviewsRouter);

export default userRouter;