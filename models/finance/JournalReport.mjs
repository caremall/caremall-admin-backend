import mongoose from "mongoose";
const { Schema, model } = mongoose;

const journalReportSchema = new Schema(
  {
    date: { type: Date, required: true },
    account: { type: Schema.Types.ObjectId, ref: "ChartOfAccount", required: true },
    voucherNo: { type: String, trim: true },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    narration: { type: String, trim: true },
    totalDebit: { type: Number, default: 0 },
    totalCredit: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const JournalReport = model("JournalReport", journalReportSchema);
export default JournalReport;
