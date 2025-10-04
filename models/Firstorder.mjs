import mongoose from "mongoose";
const { Schema, model } = mongoose;

const firstOrderSchema = new Schema(
  {
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    discountValue: {
      type: Number, // % or ₹ depending on type
      required: true,
    },
    minOrderValue: {
      type: Number, // order value condition
      default: null,
    },
  },
  { timestamps: true }
);

const FirstOrder = model("FirstOrder", firstOrderSchema);
export default FirstOrder;