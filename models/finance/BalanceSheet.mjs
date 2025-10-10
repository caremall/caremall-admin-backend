import mongoose from "mongoose";
const { Schema, model } = mongoose;

const balanceSheetSchema = new Schema(
  {
    category: { type: String, trim: true }, // Assets / Liabilities / Equity
    accountName: { type: String, trim: true },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    netTotal: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const BalanceSheet = model("BalanceSheet", balanceSheetSchema);
export default BalanceSheet;
