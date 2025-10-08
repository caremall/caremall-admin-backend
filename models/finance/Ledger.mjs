import mongoose from "mongoose";
const { Schema, model } = mongoose;

const ledgerSchema = new Schema(
  {
    date: { type: Date, required: true },
    account: {
      type: Schema.Types.ObjectId,
      ref: "ChartOfAccount",
      required: true,
    },
    voucherNo: { type: String, trim: true },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    description: { type: String, trim: true },
    narration: { type: String, trim: true },
    runningBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Ledger = model("Ledger", ledgerSchema);
export default Ledger;
