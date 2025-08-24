import express from "express";
import { createHighlight, getHighlights, deleteHighlight } from "../../controllers/admin/highlights.controller.mjs";

const router = express.Router();

// Highlight routes
router.post("/", createHighlight); // videoUrl is expected in body after upload
router.get("/", getHighlights);
router.delete("/:id", deleteHighlight);

export default router;
