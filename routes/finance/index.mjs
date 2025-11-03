import { Router } from "express";
// import { verifyFinanceAdminToken as AdminToken } from "../../middlewares/verifyToken.mjs";

import Auth from "./auth.router.mjs";
import chartRoutes from "./chartOfAccounts.router.mjs";
import bankRoutes from "./bankMaster.router.mjs";
import paymentRoutes from "./payment.router.mjs";
import receiptRoutes from "./receipt.routes.mjs";
import transferRoutes from "./bankTransfer.routes.mjs";
import journalRoutes from "./journalEntry.routes.mjs";
import debitRoutes from "./debitNote.routes.mjs";
import creditRoutes from "./creditNote.routes.mjs";
import ledgerRoutes from "./ledger.routes.mjs";

import trialBalanceRoutes from "./trialBalance.routes.mjs";
import profitLossRoutes from "./profitLoss.routes.mjs";
import balanceSheetRoutes from "./balanceSheet.routes.mjs";
import bankReconciliationRoutes from "./bankReconciliation.routes.mjs";
import soaRoutes from "./soa.routes.mjs";
import ageingSummaryRoutes from "./ageingSummary.routes.mjs";
import dayBookRoutes from "./dayBook.routes.mjs";
import cashFlowRoutes from "./cashFlow.routes.mjs";
import pdcRoutes from "./pdc.router.mjs";

const financeRouter = Router();
financeRouter.use("/auth", Auth);
financeRouter.use("/chart-of-accounts", chartRoutes);
financeRouter.use("/bank-master", bankRoutes);
financeRouter.use("/payments", paymentRoutes);
financeRouter.use("/receipts", receiptRoutes);
financeRouter.use("/bank-transfers", transferRoutes);
financeRouter.use("/journals", journalRoutes);
financeRouter.use("/debit-notes", debitRoutes);
financeRouter.use("/credit-notes", creditRoutes);
// financeRouter.use("/credit-notes", AdminToken, creditRoutes);
financeRouter.use("/ledger", ledgerRoutes);

financeRouter.use("/trial-balance", trialBalanceRoutes);
financeRouter.use("/profit-loss", profitLossRoutes);
financeRouter.use("/balance-sheet", balanceSheetRoutes);
financeRouter.use("/bank-reconciliation", bankReconciliationRoutes);
financeRouter.use("/soa", soaRoutes);
financeRouter.use("/ageing-summary", ageingSummaryRoutes);
financeRouter.use("/day-book", dayBookRoutes);
financeRouter.use("/cash-flow", cashFlowRoutes);
financeRouter.use("/pdc", pdcRoutes);

export default financeRouter;

// GET /api/ledger/account/6530aadebf3fc9dbea2f1219?fromDate=2025-01-01&toDate=2025-12-31
