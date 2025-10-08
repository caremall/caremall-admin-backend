import mongoose from "mongoose";
const { Schema, model } = mongoose;

const chartOfAccountSchema = new Schema(
  {
    code: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    accountType: { type: String, required: true, trim: true }, // Asset, Liability, Income, Expense
    subType: { type: String, trim: true }, // Current Asset, Fixed Asset
    classification: { type: String, trim: true }, // Customer, Supplier, Bank, etc.
    createdOn: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const ChartOfAccount = model("ChartOfAccount", chartOfAccountSchema);
export default ChartOfAccount;
