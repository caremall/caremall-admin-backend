import express from "express";
import { getTestimonialById, getTestimonials } from "../../controllers/user/testimonials.controller.mjs";
const router = express.Router();

// Highlight routes
router.get("/", getTestimonials);
router.get("/:id", getTestimonialById);

export default router;
