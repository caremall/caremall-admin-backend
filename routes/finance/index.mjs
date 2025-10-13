import { Router } from "express";
import { verifyFinanceAdminToken as AdminToken } from "../../middlewares/verifyToken.mjs";

import Auth from "../../routes/finance/auth.router.mjs";
import chartRoutes from "../../routes/finance/chartOfAccounts.router.mjs";
import bankRoutes from "../../routes/finance/bankMaster.router.mjs";
import paymentRoutes from "../../routes/finance/payment.router.mjs";
import receiptRoutes from "../../routes/finance/receipt.routes.mjs";
import transferRoutes from "../../routes/finance/bankTransfer.routes.mjs";
import journalRoutes from "../../routes/finance/journalEntry.routes.mjs";
import debitRoutes from "../../routes/finance/debitNote.routes.mjs";
import creditRoutes from "../../routes/finance/creditNote.routes.mjs";

const financeRouter = Router();
financeRouter.use("/auth", Auth);
financeRouter.use("/chart-of-accounts", AdminToken, chartRoutes);
financeRouter.use("/bank-master", AdminToken, bankRoutes);
financeRouter.use("/payments", AdminToken, paymentRoutes);
financeRouter.use("/receipts", AdminToken, receiptRoutes);
financeRouter.use("/bank-transfers", AdminToken, transferRoutes);
financeRouter.use("/journals", AdminToken, journalRoutes);
financeRouter.use("/debit-notes", AdminToken, debitRoutes);
financeRouter.use("/credit-notes", AdminToken, creditRoutes);

export default financeRouter;
