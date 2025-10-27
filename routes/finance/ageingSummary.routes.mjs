import express from "express";
import { verifyFinanceAdminToken as financeToken } from "../../middlewares/verifyToken.mjs";
import { getAgeingSummary } from "../../controllers/finance/ageingSummary.controller.mjs";

const router = express.Router();

router.get("/", financeToken, getAgeingSummary);

export default router;

// GET /api/ageing-summary?partnerType=customer&asOnDate=2025-10-19