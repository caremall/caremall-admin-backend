import { Router } from "express";
import authRouter from "./auth.router.mjs";
import categoryRouter from "./category.router.mjs";
import brandRouter from "./brands.router.mjs";
import productsRouter from "./products.routes.mjs";
import variantRouter from "./variants.router.mjs";
import productTypeRouter from "./productType.router.mjs";
const warehouseRouter = Router()

warehouseRouter.use("/auth", authRouter);

warehouseRouter.use("/categories", categoryRouter);
warehouseRouter.use("/brands", brandRouter);
warehouseRouter.use("/products", productsRouter);
warehouseRouter.use("/variants", variantRouter);
warehouseRouter.use("/product-types", productTypeRouter);

export default warehouseRouter;