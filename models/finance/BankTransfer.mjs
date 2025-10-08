import mongoose from "mongoose";
const { Schema, model } = mongoose;

const bankTransferSchema = new Schema(
  {
    date: { type: Date, required: true },
    fromBank: { type: Schema.Types.ObjectId, ref: "BankMaster", required: true },
    paymentType: { type: String, trim: true },
    toBank: { type: Schema.Types.ObjectId, ref: "BankMaster", required: true },
    docAmount: { type: Number, required: true },
    narration: { type: String, trim: true },
  },
  { timestamps: true }
);

const BankTransfer = model("BankTransfer", bankTransferSchema);
export default BankTransfer;
