import { Router } from "express";
import { login, logout, refreshAccessToken, signup } from "../../controllers/user/auth.controller.mjs";
import { catchAsyncErrors } from "../../utils/catchAsyncErrors.mjs";

const router = Router()

router.post('/signup', catchAsyncErrors(signup));
router.post('/login', login);
router.post('/refresh-token', refreshAccessToken);
router.post('/logout', logout);

export default router