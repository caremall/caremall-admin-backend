import Testimonials from "../../models/Testimonials.mjs";

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

// UPDATE testimonial by ID
export const updateTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, rating, profession, company, testimonial } = req.body;
    if (!id) {
      return res.status(400).json({ message: "Testimonial ID is required" });
    }
    const testimonialDoc = await Testimonials.findById(id);
    if (!testimonialDoc) {
      return res.status(404).json({ message: "Testimonial not found" });
    }
    if (name) testimonialDoc.name = name;
    if (rating) testimonialDoc.rating = rating;
    if (profession) testimonialDoc.profession = profession;
    if (company) testimonialDoc.company = company;
    if (testimonial) testimonialDoc.testimonial = testimonial;

    await testimonialDoc.save();
    res
      .status(200)
      .json({ message: "Testimonial updated", testimonial: testimonialDoc });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to update testimonial", error: error.message });
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
