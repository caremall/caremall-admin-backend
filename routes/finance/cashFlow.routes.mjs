import express from "express";
import { verifyFinanceAdminToken as financeToken } from "../../middlewares/verifyToken.mjs";
import { getCashFlow } from "../../controllers/finance/cashFlow.controller.mjs";

const router = express.Router();

router.get("/",  getCashFlow);

export default router;


// GET /api/cash-flow?fromDate=2025-01-01&toDate=2025-12-31
