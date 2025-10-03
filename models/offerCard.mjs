import mongoose from "mongoose";
const { Schema, model } = mongoose;

const offerCardSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      trim: true,
    },
    offerPreviewType: {
      type: String,
      enum: ["grid", "carousel", "list"],
      required: true,
    },
    offers: [
      {
        type: Schema.Types.ObjectId,
        ref: "Offer", 
        required: true,
      },
    ],
    carouselSettings: {
      enabled: { type: Boolean, default: false },
      slideDurationSeconds: { type: Number, default: 5 }, // Example setting
      autoplay: { type: Boolean, default: true },
      // Add any other carousel config fields as needed
    },
  },
  { timestamps: true }
);

const OfferCard = model("OfferCard", offerCardSchema);
export default OfferCard;
