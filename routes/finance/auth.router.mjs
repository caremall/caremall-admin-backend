import express from "express";
import {
  registerFinanceAdmin,
  loginFinanceAdmin,
  getFinanceAdminProfile,
  getAllFinanceAdmins,
} from "../../controllers/finance/auth.controller.mjs";
import { verifyFinanceAdminToken as financeToken } from "../../middlewares/verifyToken.mjs";

const router = express.Router();

router.post("/signup", registerFinanceAdmin);
router.post("/login", loginFinanceAdmin);
router.get("/profile", financeToken, getFinanceAdminProfile);
router.get("/admins", getAllFinanceAdmins);

export default router;
