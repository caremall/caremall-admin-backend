import mongoose from "mongoose";
const { Schema, model } = mongoose;

const profitLossSchema = new Schema(
  {
    section: { type: String, trim: true }, // Income / Expense
    accountCode: { type: String, trim: true },
    accountName: { type: String, trim: true },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    netTotal: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const ProfitLoss = model("ProfitLoss", profitLossSchema);
export default ProfitLoss;
