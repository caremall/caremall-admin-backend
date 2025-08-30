import mongoose from "mongoose";
const { Schema, model } = mongoose;

const couponSchema = new Schema(
  {
    code: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"], // % or flat amount
      required: true,
    },
    discountValue: {
      type: Number,
      required: true, // e.g., 20 (for 20% or ₹20 off)
    },
    maxDiscountAmount: {
      type: Number, // cap for percentage discount
      default: null,
    },
    usageLimit: {
      type: Number,
      default: null, // max number of uses
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    expiryDate: {
      type: Date,
      required: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: String,
      default: "Admin",
      trim: true,
    },
  },
  { timestamps: true }
);


const Coupon = model("Coupon", couponSchema);
export default Coupon;
