import mongoose from "mongoose";

const bankTransferSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    fromBank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankMaster",
      required: true,
    },
    toBank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankMaster",
      required: true,
    },
    paymentType: { type: String, required: true },
    docAmount: { type: Number, required: true },
    narration: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("BankTransfer", bankTransferSchema);
