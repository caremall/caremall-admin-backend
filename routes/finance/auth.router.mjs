import express from "express";
import {
  registerFinanceAdmin,
  loginFinanceAdmin,
  getFinanceAdminProfile,
  getAllFinanceAdmins,
  getFinanceAdminById,
  updateFinanceAdmin,
  deleteFinanceAdmin,
} from "../../controllers/finance/auth.controller.mjs";
import { verifyFinanceAdminToken as financeToken } from "../../middlewares/verifyToken.mjs";

const router = express.Router();

router.post("/signup", registerFinanceAdmin);
router.post("/login", loginFinanceAdmin);
router.put("/edit/:id", updateFinanceAdmin);
router.delete("/delete/:id", deleteFinanceAdmin);
router.get("/profile", financeToken, getFinanceAdminProfile);
router.get("/admins", getAllFinanceAdmins);
router.get("/admins/:id", getFinanceAdminById);


export default router;
