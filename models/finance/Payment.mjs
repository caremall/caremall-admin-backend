import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    paymentCategory: { type: String, required: true },
    party: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChartOfAccount", // Party is linked to CoA (e.g., vendor/customer account)
      required: true,
    },
    date: { type: Date, required: true },
    bank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankMaster",
      required: true,
    },
    paymentType: { type: String, required: true },
    docAmount: { type: Number, required: true },
    balAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Received", "Pending", "Cancelled"],
      default: "Received",
    },
    allocatedAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    narration: { type: String },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);
