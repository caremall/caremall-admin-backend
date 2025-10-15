import mongoose from "mongoose";

const creditNoteSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    reference: { type: String },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChartOfAccount",
      required: true,
    },
    type: { type: String, required: true },
    narration: { type: String },
    vat: { type: Number, default: 0 },
    amount: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ["Draft", "Confirmed"], default: "Draft" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("CreditNote", creditNoteSchema);
