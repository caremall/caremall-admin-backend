import express from "express";
import {
  getAllReviewsAdmin,
  getReviewByIdAdmin,
  updateReviewStatus,
  deleteReviewAdmin,
} from "../../controllers/admin/reviews.controller.mjs";

const router = express.Router();

// GET /admin/reviews?status=approved&search=...
router.get("/", getAllReviewsAdmin);

// GET /admin/reviews/:id
router.get("/:id", getReviewByIdAdmin);

// PATCH /admin/reviews/:id/status
router.patch("/:id/status", updateReviewStatus);

// DELETE /admin/reviews/:id
router.delete("/:id", deleteReviewAdmin);

export default router;
