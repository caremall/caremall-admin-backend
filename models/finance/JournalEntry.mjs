import mongoose from "mongoose";
const { Schema, model } = mongoose;

const journalEntrySchema = new Schema(
  {
    date: { type: Date, required: true },
    voucherNo: { type: String, trim: true },
    entries: [
      {
        account: { type: Schema.Types.ObjectId, ref: "ChartOfAccount", required: true },
        debit: { type: Number, default: 0 },
        credit: { type: Number, default: 0 },
        narration: { type: String, trim: true },
      }
    ],
    totalDebit: { type: Number, default: 0 },
    totalCredit: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const JournalEntry = model("JournalEntry", journalEntrySchema);
export default JournalEntry;
