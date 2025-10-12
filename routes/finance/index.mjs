import { Router } from "express";
import { verifyFinanceAdminToken as AdminToken } from "../../middlewares/verifyToken.mjs";

import chartRoutes from "../../routes/finance/chartOfAccounts.router.mjs";
import bankRoutes from "../../routes/finance/bankMaster.router.mjs";
import paymentRoutes from "../../routes/finance/payment.router.mjs";
import receiptRoutes from "../../routes/finance/receipt.routes.mjs";
import transferRoutes from "../../routes/finance/bankTransfer.routes.mjs";
import journalRoutes from "../../routes/finance/journalEntry.routes.mjs";
import debitRoutes from "../../routes/finance/debitNote.routes.mjs";
import creditRoutes from "../../routes/finance/creditNote.routes.mjs";

const financeRouter = Router();
financeRouter.use("/api/charts", AdminToken, chartRoutes);
financeRouter.use("/api/banks", AdminToken, bankRoutes);
financeRouter.use("/api/payments", AdminToken, paymentRoutes);
financeRouter.use("/api/receipts", AdminToken, receiptRoutes);
financeRouter.use("/api/transfers", AdminToken, transferRoutes);
financeRouter.use("/api/journals", AdminToken, journalRoutes);
financeRouter.use("/api/debit-notes", AdminToken, debitRoutes);
financeRouter.use("/api/credit-notes", AdminToken, creditRoutes);

export default financeRouter;
