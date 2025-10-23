import express from "express";
import { getProfitLoss } from "../../controllers/finance/profitLoss.controller.mjs";
import { verifyFinanceAdminToken as financeToken } from "../../middlewares/verifyToken.mjs";

const router = express.Router();

router.get("/", financeToken, getProfitLoss);

export default router;
