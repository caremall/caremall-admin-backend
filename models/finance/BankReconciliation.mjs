import mongoose from "mongoose";
const { Schema, model } = mongoose;

const bankReconciliationSchema = new Schema(
  {
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    type: { type: String, trim: true },
    date: { type: Date, required: true },
    reference: { type: String, trim: true },
    amount: { type: Number, default: 0 },
    mode: { type: String, trim: true },
    chequeNo: { type: String, trim: true },
    chequeDate: { type: Date },
    clearedOn: { type: Date },
  },
  { timestamps: true }
);

const BankReconciliation = model("BankReconciliation", bankReconciliationSchema);
export default BankReconciliation;
