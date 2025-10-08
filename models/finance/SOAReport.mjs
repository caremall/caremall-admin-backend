import mongoose from "mongoose";
const { Schema, model } = mongoose;

const soaReportSchema = new Schema(
  {
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    selectBy: { type: String, trim: true },
    businessPartner: { type: Schema.Types.ObjectId, ref: "ChartOfAccount" },
    reportType: { type: String, trim: true },
    openingBalance: { type: Number, default: 0 },
    invoicedAmount: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    transactions: [
      {
        date: { type: Date },
        details: { type: String, trim: true },
        amount: { type: Number, default: 0 },
        payment: { type: Number, default: 0 },
        balance: { type: Number, default: 0 },
      }
    ]
  },
  { timestamps: true }
);

const SOAReport = model("SOAReport", soaReportSchema);
export default SOAReport;
