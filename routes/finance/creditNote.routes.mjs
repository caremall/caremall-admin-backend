import express from "express";
import * as ctrl from "../../controllers/finance/creditNote.controller.mjs";
import { verifyFinanceAdminToken as financeToken } from "../../middlewares/verifyToken.mjs";

const router = express.Router();

router.post("/", financeToken, ctrl.createCreditNote);
router.get("/", financeToken, ctrl.getCreditNotes);
router.get("/:id", financeToken, ctrl.getCreditNoteById);
router.put("/:id", financeToken, ctrl.updateCreditNote);
router.delete("/:id", financeToken, ctrl.deleteCreditNote);
router.post("/:id/confirm", financeToken, ctrl.confirmCreditNote);

export default router;
