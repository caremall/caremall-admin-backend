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
import subscriberRouter from "./subscriber.router.mjs"
import heroBannerRouter from "./heroBanner.router.mjs";
import offerRouter from "./offers.router.mjs";
import highlightsRouter from "./highlights.router.mjs";
import offerCardRouter from "./offer.card.routes.mjs";
import photoGalleryRouter from "./photo.gallery.router.mjs";
import productCardRouter from "./product.card.router.mjs";
// import firstOrderRouter from "./firstorder.router.mjs";
const userRouter = Router()

userRouter.use("/auth", authRouter);
userRouter.use("/upload", uploadRouter);
userRouter.use("/products", productsRouter);
userRouter.use("/cart", cartRouter);

// userRouter.use("/first-order-amount", firstOrderRouter);
userRouter.use("/wishlist", wishlistRouter);
userRouter.use("/addresses", addressRouter);
userRouter.use("/orders", ordersRouter);
userRouter.use("/returns", returnRouter);
userRouter.use("/brands", brandRouter);
userRouter.use("/hero-banners", heroBannerRouter);
userRouter.use("/offers", offerRouter);
userRouter.use("/categories", categoriesRouter);
userRouter.use("/reviews", reviewsRouter);
userRouter.use("/subscriber",subscriberRouter)
userRouter.use("/highlights", highlightsRouter);
userRouter.use("/offer-cards", offerCardRouter);
userRouter.use("/photo-gallery", photoGalleryRouter);
userRouter.use("/product-cards", productCardRouter);
export default userRouter;