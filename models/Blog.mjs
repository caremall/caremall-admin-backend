import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const blogSchema = new mongoose.Schema(
  {
   
    title: {
      type: String,
      required: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: false,
    },
    publishedDate: {
      type: Date,
      default: Date.now,
    },
    description: {
      type: String,
      required: false, 
      trim: true,
      
    },
    author: {
      type: String,  
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    tags: {
      type: [String], 
      default: []
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    metaTitle: {
      type: String,
      required: false 
    },
    metaDescription: {
      type: String,
      required: false
    },
    slug: {
      type: String,
      unique: true,
      sparse: true 
    }
  },
  { timestamps: true }
);

const Blog = model('Blog', blogSchema);
export default Blog;