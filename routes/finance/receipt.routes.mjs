import express from "express";
import * as ctrl from "../../controllers/finance/receipt.controller.mjs";
import { verifyFinanceAdminToken as financeToken } from "../../middlewares/verifyToken.mjs";

const router = express.Router();

router.post("/", financeToken, ctrl.createReceipt);
router.get("/", financeToken, ctrl.getReceipts);
router.get("/:id", financeToken, ctrl.getReceiptById);
router.put("/:id", financeToken, ctrl.updateReceipt);
router.delete("/:id", financeToken, ctrl.deleteReceipt);

export default router;
