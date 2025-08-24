import { Router } from "express";
import authRouter from "./auth.router.mjs";
import categoryRouter from "./category.router.mjs";
import brandRouter from "./brands.router.mjs";
import productsRouter from "./products.routes.mjs";
import variantRouter from "./variants.router.mjs";
import productTypeRouter from "./productType.router.mjs";
import ordersRouter from "./orders.router.mjs";
import { verifyToken } from "../../middlewares/verifyToken.mjs";
const warehouseRouter = Router()

warehouseRouter.use("/auth", authRouter);

warehouseRouter.use("/categories", verifyToken, categoryRouter);
warehouseRouter.use("/brands", verifyToken, brandRouter);
warehouseRouter.use("/products", verifyToken, productsRouter);
warehouseRouter.use("/variants", verifyToken, variantRouter);
warehouseRouter.use("/product-types", verifyToken, productTypeRouter);
warehouseRouter.use("/orders", verifyToken, ordersRouter);

export default warehouseRouter;