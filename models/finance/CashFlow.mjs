import mongoose from "mongoose";
const { Schema, model } = mongoose;

const cashFlowSchema = new Schema(
  {
    category: { type: String, trim: true },
    openingBalance: { type: Number, default: 0 },
    inflows: { type: Number, default: 0 }, // Dr
    outflows: { type: Number, default: 0 }, // Cr
    net: { type: Number, default: 0 },
    closingBalance: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const CashFlow = model("CashFlow", cashFlowSchema);
export default CashFlow;
