import { Router } from "express";
import { editAdminProfile, getLoggedInAdmin, login, logout, refresh } from "../../controllers/warehouse/auth.controller.mjs";
import { verifyToken } from "../../middlewares/verifyToken.mjs";

const authRouter = Router();

authRouter.post("/login", login);
authRouter.get("/refresh", refresh);
authRouter.get("/logout", logout);
authRouter.get("/me",verifyToken, getLoggedInAdmin);
authRouter.put("/update", editAdminProfile);

export default authRouter;
