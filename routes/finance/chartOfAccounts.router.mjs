import express from "express";
import * as ctrl from "../../controllers/finance/chartOfAccounts.controller.mjs";
import { verifyFinanceAdminToken as financeToken } from "../../middlewares/verifyToken.mjs";

const router = express.Router();

router.post("/", financeToken, ctrl.createChart);
router.get("/", financeToken, ctrl.getCharts);
router.get("/:id", financeToken, ctrl.getChartById);
router.put("/:id", financeToken, ctrl.updateChart);
router.delete("/:id", financeToken, ctrl.deleteChart);

export default router;
