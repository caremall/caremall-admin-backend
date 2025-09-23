import { Router } from "express";
import authRouter from "./auth.router.mjs";
import categoryRouter from "./category.router.mjs";
import brandRouter from "./brands.router.mjs";
import productsRouter from "./products.routes.mjs";
import variantRouter from "./variants.router.mjs";
import productTypeRouter from "./productType.router.mjs";
import ordersRouter from "./orders.router.mjs";
import { verifyToken } from "../../middlewares/verifyToken.mjs";
import inventoryRouter from "./inventory.routes.mjs";
import driverRouter from "./driver.router.mjs";
import locationRouter from "./location.router.mjs";
import supplierRouter from "./supplier.router.mjs";
import returnsRouter from "./returns.router.mjs";
import dashboardRouter from "./dashboard.router.mjs";
const warehouseRouter = Router()

warehouseRouter.use("/auth", authRouter);

warehouseRouter.use("/categories", verifyToken, categoryRouter);
warehouseRouter.use("/brands", verifyToken, brandRouter);
warehouseRouter.use("/products", verifyToken, productsRouter);
warehouseRouter.use("/variants", verifyToken, variantRouter);
warehouseRouter.use("/product-types", verifyToken, productTypeRouter);
warehouseRouter.use("/orders", verifyToken, ordersRouter);
warehouseRouter.use("/inventory", verifyToken, inventoryRouter);
warehouseRouter.use("/drivers", verifyToken, driverRouter);
warehouseRouter.use("/locations", verifyToken, locationRouter);
warehouseRouter.use("/supplier", verifyToken, supplierRouter);
warehouseRouter.use("/returns", verifyToken, returnsRouter);
warehouseRouter.use("/dashboard", verifyToken, dashboardRouter);

export default warehouseRouter;