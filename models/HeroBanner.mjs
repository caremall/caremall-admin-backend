import mongoose from "mongoose";

const heroBannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    bannerImage: {
      type: String,
      required: true,
    },
    buttonText: {
      type: String,
      trim: true,
    },
    buttonLinkType: {
      type: String,
    },
    redirectLink: {
      type: String,
      trim: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("HeroBanner", heroBannerSchema);
