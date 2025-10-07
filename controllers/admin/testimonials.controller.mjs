import Testimonials from "../../models/Testimonials.mjs";
import mongoose from 'mongoose';

// CREATE testimonial
export const createTestimonial = async (req, res) => {
  try {
    const { name, rating, profession, company, testimonial } = req.body;
    if (!name || !rating || !profession) {
      return res
        .status(400)
        .json({ message: "Name, rating, and profession are required" });
    }
    const created = await Testimonials.create({
      name,
      rating,
      profession,
      company,
      testimonial,
    });
    res
      .status(201)
      .json({ message: "Testimonial created", testimonial: created });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to create testimonial", error: error.message });
  }
};

// READ all testimonials
export const getTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonials.find().lean();
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



export const updateTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, rating, profession, company, testimonial, isActive } = req.body;
    
    if (!id) {
      return res.status(400).json({ message: "Testimonial ID is required" });
    }

    // Validate if ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid testimonial ID" });
    }

    const testimonialDoc = await Testimonials.findById(id);
    if (!testimonialDoc) {
      return res.status(404).json({ message: "Testimonial not found" });
    }

    // Update fields if they are provided
    if (name !== undefined) testimonialDoc.name = name;
    if (rating !== undefined) testimonialDoc.rating = rating;
    if (profession !== undefined) testimonialDoc.profession = profession;
    if (company !== undefined) testimonialDoc.company = company;
    if (testimonial !== undefined) testimonialDoc.testimonial = testimonial;
    if (isActive !== undefined) testimonialDoc.isActive = isActive; // Fixed variable name

    await testimonialDoc.save();
    
    res.status(200).json({ 
      message: "Testimonial updated successfully", 
      testimonial: testimonialDoc 
    });
  } catch (error) {
    console.error("Update testimonial error:", error);
    res.status(500).json({ 
      message: "Failed to update testimonial", 
      error: error.message 
    });
  }
};
// DELETE testimonial by ID
export const deleteTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const testimonial = await Testimonials.findById(id);
    if (!testimonial) {
      return res.status(404).json({ message: "Testimonial not found" });
    }
    await testimonial.deleteOne();
    res.status(200).json({ message: "Testimonial deleted successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to delete testimonial", error: error.message });
  }
};
