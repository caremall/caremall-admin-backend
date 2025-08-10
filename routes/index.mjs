import { Router } from "express";
import adminRouter from "./admin/index.mjs";
import userRouter from "./user/index.mjs";

const router =Router()

router.use("/api/v1/admin",adminRouter);
router.use("/api/v1/user",userRouter);

export default router;