import express from "express";
import { verifyFinanceAdminToken as financeToken } from "../../middlewares/verifyToken.mjs";
import {
  getBankReconciliation,
  clearBankTransaction,
} from "../../controllers/finance/bankReconciliation.controller.mjs";

const router = express.Router();

router.get("/", financeToken, getBankReconciliation);
router.patch("/:id/clear", financeToken, clearBankTransaction);

export default router;

// GET /api/bank-reconciliation?fromDate=2025-01-01&toDate=2025-12-31&bankName=HDFC
