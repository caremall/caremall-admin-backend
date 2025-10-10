import { Router } from "express";
import authRouter from "./auth.router.mjs";

const financeRouter = Router();
financeRouter.use("/auth", authRouter);

export default financeRouter;
