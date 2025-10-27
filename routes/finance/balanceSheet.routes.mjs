import express from "express";
import { getBalanceSheet } from "../../controllers/finance/balanceSheet.controller.mjs";
import { verifyFinanceAdminToken as financeToken } from "../../middlewares/verifyToken.mjs";

const router = express.Router();

router.get("/", financeToken, getBalanceSheet);

export default router;
