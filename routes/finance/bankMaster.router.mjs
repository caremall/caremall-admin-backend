import express from "express";
import * as ctrl from "../../controllers/finance/bankMaster.controller.mjs";
import { verifyFinanceAdminToken as financeToken } from "../../middlewares/verifyToken.mjs";

const router = express.Router();

router.post("/", financeToken, ctrl.createBank);
router.get("/", financeToken, ctrl.getBanks);
router.get("/:id", financeToken, ctrl.getBankById);
router.put("/:id", financeToken, ctrl.updateBank);
router.delete("/:id", financeToken, ctrl.deleteBank);

export default router;
