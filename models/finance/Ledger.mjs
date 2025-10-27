import mongoose from "mongoose";

const ledgerSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChartOfAccount",
      required: true,
    },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    narration: { type: String },
    referenceId: { type: mongoose.Schema.Types.ObjectId, required: true }, // e.g., Payment._id
    referenceType: {
      type: String,
      enum: [
        "Payment",
        "Receipt",
        "JournalEntry",
        "DebitNote",
        "CreditNote",
        "BankTransfer",
      ],
      required: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Ledger", ledgerSchema);
