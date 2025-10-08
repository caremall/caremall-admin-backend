import mongoose from "mongoose";
const { Schema, model } = mongoose;

const trialBalanceSchema = new Schema(
  {
    accountCode: { type: String, trim: true },
    accountName: { type: String, trim: true },
    debitTotal: { type: Number, default: 0 },
    creditTotal: { type: Number, default: 0 },
    netBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const TrialBalance = model("TrialBalance", trialBalanceSchema);
export default TrialBalance;
