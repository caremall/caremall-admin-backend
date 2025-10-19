import express from "express";
import { verifyFinanceAdminToken as financeToken } from "../../middlewares/verifyToken.mjs";
import { getDayBook } from "../../controllers/finance/dayBook.controller.mjs";

const router = express.Router();

router.get("/", financeToken, getDayBook);

export default router;

// GET /api/day-book?fromDate=2025-01-01&toDate=2025-01-31
