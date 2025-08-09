import { Router } from "express";

import { verifyUserToken } from "../../middlewares/verifyToken.mjs";
import { updateProfile } from "../../controllers/user/profile.controller.mjs";

const router = Router()

router.put('/profile', verifyUserToken, updateProfile);

export default router