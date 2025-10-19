import express from "express";
import { verifyFinanceAdminToken as financeToken } from "../../middlewares/verifyToken.mjs";
import { getSOA } from "../../controllers/finance/soa.controller.mjs";

const router = express.Router();

router.get("/", financeToken, getSOA);

export default router;


// GET /api/soa?fromDate=2025-01-01&toDate=2025-12-31&partnerName=Global%20Supermarket&partnerType=customer&reportType=detailed
