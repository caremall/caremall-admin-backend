import express from "express";
import { createHighlight, getHighlights, deleteHighlight, getHighlightById, updateHighlight } from "../../controllers/admin/highlights.controller.mjs";

const router = express.Router();

// Highlight routes
router.post("/", createHighlight); // videoUrl is expected in body after upload
router.put("/:id", updateHighlight);
router.get("/", getHighlights);
router.get("/:id", getHighlightById);
router.delete("/:id", deleteHighlight);

export default router;
