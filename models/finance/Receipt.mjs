import mongoose from "mongoose";

const receiptSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    bank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankMaster",
      required: true,
    },
    receiptType: { type: String, required: true },
    fromAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChartOfAccount", // from party or account
      required: true,
    },
    docAmount: { type: Number, required: true },
    allocatedAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    narration: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Receipt", receiptSchema);
