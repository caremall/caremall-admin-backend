import express from "express";
import {
  registerFinanceAdmin,
  loginFinanceAdmin,
  getFinanceAdminProfile,
} from "../../controllers/finance/auth.controller.mjs";
import { verifyFinanceAdminToken } from "../../middlewares/verifyToken.mjs";

const router = express.Router();

router.post("/signup", registerFinanceAdmin);
router.post("/login", loginFinanceAdmin);
router.get("/profile", verifyFinanceAdminToken, getFinanceAdminProfile);

export default router;
