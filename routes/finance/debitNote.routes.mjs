import express from "express";
import * as ctrl from "../../controllers/finance/debitNote.controller.mjs";
import { verifyFinanceAdminToken as financeToken } from "../../middlewares/verifyToken.mjs";

const router = express.Router();

router.post("/", financeToken, ctrl.createDebitNote);
router.get("/", financeToken, ctrl.getDebitNotes);
router.get("/:id", financeToken, ctrl.getDebitNoteById);
router.put("/:id", financeToken, ctrl.updateDebitNote);
router.delete("/:id", financeToken, ctrl.deleteDebitNote);
router.post("/:id/confirm", financeToken, ctrl.confirmDebitNote);

export default router;