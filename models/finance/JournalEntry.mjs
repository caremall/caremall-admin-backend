import mongoose from "mongoose";

const journalEntrySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    voucher: { type: String, required: true },
    entries: [
      {
        account: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ChartOfAccount",
          required: true,
        },
        debit: { type: Number, default: 0 },
        credit: { type: Number, default: 0 },
        narration: { type: String },
      },
    ],
    totalDebit: { type: Number, default: 0 },
    totalCredit: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("JournalEntry", journalEntrySchema);
