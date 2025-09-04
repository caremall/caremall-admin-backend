import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const testimonialSchema = new Schema({
    name: {
    type: String,
    required: true,
  },
  rating: {
    type: String,
    required: true,
  },
  profession:{
    type: String,
    required: true,
  },
  company:{
    type: String,
  },
  testimonial:{
    type: String,
  }
  

},{ timestamps: true });

const Testimonials = model('Testimonials', testimonialSchema);

export default Testimonials;