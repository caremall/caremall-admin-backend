import Testimonials from "../../models/Testimonials.mjs";
import mongoose from 'mongoose';



// READ all testimonials
export const getTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonials.find({ isActive: true }).lean();
    res.status(200).json(testimonials);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to fetch testimonials", error: error.message });
  }
};


// READ testimonial by ID
export const getTestimonialById = async (req, res) => {
  try {
    const { id } = req.params;
    const testimonial = await Testimonials.findById(id).lean();
    if (!testimonial) {
      return res.status(404).json({ message: "Testimonial not found" });
    }
    res.status(200).json(testimonial);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to fetch testimonial", error: error.message });
  }
};
