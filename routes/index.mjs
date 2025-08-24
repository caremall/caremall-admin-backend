import { Router } from "express";
import adminRouter from "./admin/index.mjs";
import userRouter from "./user/index.mjs";
import warehouseRouter from "./warehouse/index.mjs";

const router =Router()

router.use("/api/v1/admin",adminRouter);
router.use("/api/v1/user",userRouter);
router.use("/api/v1/warehouse",warehouseRouter);

export default router;