import { Router } from "express";
import { changeAdminStatus, createAdmin, deleteAdmin, getAdminById, getAllAdmins, updateAdmin } from "../../controllers/admin/admins.controller.mjs";
import uploadRouter from "./upload.router.mjs";
import authRouter from "./auth.router.mjs";
import roleRouter from "./role.router.mjs";
import categoryRouter from "./category.router.mjs";
import brandRouter from "./brands.router.mjs";
import productsRouter from "./products.routes.mjs";
import variantRouter from "./variants.router.mjs";
import blogsRouter from "./blogs.router.mjs";
import reviewRouter from "./reviews.routes.mjs";
import productTypeRouter from "./productType.router.mjs";
import ordersRouter from "./orders.router.mjs";
import retursRouter from "./returns.router.mjs";
import userRouter from "./users.router.mjs";
import offerRouter from "./offers.router.mjs";
import heroBannerRouter from "./heroBanner.router.mjs";
import adminWarehouseRouter from "./warehouse.router.mjs";
import highlightRouter from "./highlights.router.mjs";

const adminRouter = Router()

adminRouter.use("/upload", uploadRouter);
adminRouter.use("/auth", authRouter);
adminRouter.use("/roles", roleRouter);
adminRouter.use("/categories", categoryRouter);
adminRouter.use("/brands", brandRouter);
adminRouter.use("/products", productsRouter);
adminRouter.use("/orders", ordersRouter);
adminRouter.use("/returns", retursRouter);
adminRouter.use("/variants", variantRouter);
adminRouter.use("/blogs", blogsRouter);
adminRouter.use("/reviews", reviewRouter);
adminRouter.use('/highlights', highlightRouter)
adminRouter.use("/product-types", productTypeRouter)
adminRouter.use("/offer", offerRouter);
adminRouter.use("/users", userRouter);
adminRouter.use("/offer", offerRouter);
adminRouter.use('/hero-banners', heroBannerRouter)
adminRouter.use('/warehouse', adminWarehouseRouter)

//!admin parent routes
//get all admins
adminRouter.get("/", getAllAdmins);

// GET /api/admins/:id
adminRouter.get("/:id", getAdminById);

// POST /api/admins
adminRouter.post("/", createAdmin);

// PUT /api/admins/:id
adminRouter.put("/:id", updateAdmin);

// PATCH /api/admins/:id/status
adminRouter.patch("/:id/status", changeAdminStatus);

// DELETE /api/admins/:id
adminRouter.delete("/:id", deleteAdmin);


export default adminRouter;