import express from "express";
import * as ctrl from "../../controllers/finance/pdc.controller.mjs";
import { verifyFinanceAdminToken as financeToken } from "../../middlewares/verifyToken.mjs";

const router = express.Router();

router.get("/", financeToken, ctrl.getPDCList);

export default router;
