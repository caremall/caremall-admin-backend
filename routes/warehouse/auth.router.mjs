import { Router } from "express";
import { login, logout, refresh } from "../../controllers/warehouse/auth.controller.mjs";

const authRouter = Router();

authRouter.post("/login", login);
authRouter.get("/refresh", refresh);
authRouter.get("/logout", logout);

export default authRouter;
