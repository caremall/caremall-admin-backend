import mongoose from "mongoose";
const { Schema, model } = mongoose;

const receiptSchema = new Schema(
  {
    date: { type: Date, required: true },
    bankName: { type: Schema.Types.ObjectId, ref: "BankMaster", required: true },
    receiptType: { type: String, trim: true },
    docAmount: { type: Number, required: true },
    allocatedAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    narration: { type: String, trim: true },
  },
  { timestamps: true }
);

const Receipt = model("Receipt", receiptSchema);
export default Receipt;
