import { Router } from "express";
import { updateProfile } from "../../controllers/user/auth.controller.mjs";
import { verifyUserToken } from "../../middlewares/verifyToken.mjs";

const router = Router()

router.put('/profile', verifyUserToken, updateProfile);

export default router