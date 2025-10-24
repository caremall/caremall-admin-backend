import express from "express";
import { getLedgerByAccount, getLedgerSummary } from "../../controllers/finance/ledger.controller.mjs";
import { verifyFinanceAdminToken as financeToken } from "../../middlewares/verifyToken.mjs";

const router = express.Router();
router.get("/account/:accountId", financeToken, getLedgerByAccount);
router.get("/summary", financeToken, getLedgerSummary);
export default router;