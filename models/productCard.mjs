import mongoose from "mongoose";
const { Schema, model } = mongoose;

const productCardSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    buttonText: {
      type: String,
    },
    buttonLinkType: {
      type: String,
    },
    redirectLink: {
      type: String,
      trim: true,
    },
    products: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product", // Reference to Product model
        required: true,
      },
    ],
  },
  { timestamps: true }
);

const ProductCard = model("ProductCard", productCardSchema);
export default ProductCard;
