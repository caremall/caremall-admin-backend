import express from "express";
import { createTestimonial, deleteTestimonial, getTestimonialById, getTestimonials, updateTestimonial } from "../../controllers/admin/testimonials.controller.mjs";


const router = express.Router();

// testimonial routes
router.post("/", createTestimonial); 
router.put("/:id", updateTestimonial);
router.get("/", getTestimonials);
router.get("/:id", getTestimonialById);
router.delete("/:id", deleteTestimonial);

export default router;
