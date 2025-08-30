import express from "express";
import { getHighlightById, getHighlights } from "../../controllers/admin/highlights.controller.mjs";

const router = express.Router();

// Highlight routes
router.get("/", getHighlights);
router.get("/:id", getHighlightById);

export default router;
