import express from "express";
import { getTrialBalance } from "../../controllers/finance/trialBalance.controller.mjs";
import { verifyFinanceAdminToken as financeToken } from "../../middlewares/verifyToken.mjs";

const router = express.Router();

router.get("/", financeToken, getTrialBalance);

export default router;
