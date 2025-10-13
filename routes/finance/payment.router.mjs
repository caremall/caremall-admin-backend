import express from "express";
import * as ctrl from "../../controllers/finance/payment.controller.mjs";
import { verifyFinanceAdminToken as financeToken } from "../../middlewares/verifyToken.mjs";

const router = express.Router();

router.post("/", financeToken, ctrl.createPayment);
router.get("/", financeToken, ctrl.getPayments);
router.get("/:id", financeToken, ctrl.getPaymentById);
router.put("/:id", financeToken, ctrl.updatePayment);
router.delete("/:id", financeToken, ctrl.deletePayment);

export default router;
