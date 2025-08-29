import mongoose from "mongoose";
const { Schema, model } = mongoose;

const photoGallerySchema = new mongoose.Schema(
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
    buttonText: {
      type: String,
      required: true,
    },
    redirectionLink: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const PhotoGallery = model("PhotoGallery", photoGallerySchema);
export default PhotoGallery;
