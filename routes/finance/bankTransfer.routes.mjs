import express from "express";
import * as ctrl from "../../controllers/finance/bankTransfer.controller.mjs";
import { verifyFinanceAdminToken as financeToken } from "../../middlewares/verifyToken.mjs";

const router = express.Router();

router.post("/", financeToken, ctrl.createTransfer);
router.get("/", financeToken, ctrl.getTransfers);
router.get("/:id", financeToken, ctrl.getTransferById);
router.put("/:id", financeToken, ctrl.updateTransfer);
router.delete("/:id", financeToken, ctrl.deleteTransfer);

export default router;
