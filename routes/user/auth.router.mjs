import { Router } from "express";
import { login, logout, refreshAccessToken, signup } from "../../controllers/user/auth.controller.mjs";

const router = Router()

router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh-token', refreshAccessToken);
router.post('/logout', logout);

export default router