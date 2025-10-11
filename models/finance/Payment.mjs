import mongoose from "mongoose";
const { Schema, model } = mongoose;

const paymentSchema = new Schema(
  {
    paymentCategory: { type: String, required: true, trim: true },
    party: { type: Schema.Types.ObjectId, ref: "ChartOfAccount", required: true },
    date: { type: Date, required: true },
    bankName: { type: Schema.Types.ObjectId, ref: "BankMaster" },
    paymentType: { type: String, trim: true }, // e.g., Cash, Bank Transfer
    docAmount: { type: Number, required: true },
    balAmount: { type: Number, default: 0 },
    status: { type: String, trim: true, default: "Pending" },
    allocatedAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    narration: { type: String, trim: true },
  },
  { timestamps: true }
);

const Payment = model("Payment", paymentSchema);
export default Payment;
