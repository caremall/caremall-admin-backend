import express from "express";
import * as ctrl from "../../controllers/finance/journalEntry.controller.mjs";
import { verifyFinanceAdminToken as financeToken } from "../../middlewares/verifyToken.mjs";

const router = express.Router();

router.post("/", financeToken, ctrl.createJournal);
router.get("/", financeToken, ctrl.getJournals);
router.get("/:id", financeToken, ctrl.getJournalById);
router.put("/:id", financeToken, ctrl.updateJournal);
router.delete("/:id", financeToken, ctrl.deleteJournal);

export default router;
