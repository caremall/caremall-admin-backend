import mongoose from "mongoose";
const { Schema, model } = mongoose;

const debitNoteSchema = new Schema(
  {
    date: { type: Date, required: true },
    reference: { type: String, trim: true },
    customer: { type: Schema.Types.ObjectId, ref: "ChartOfAccount", required: true },
    type: { type: String, trim: true },
    narration: { type: String, trim: true },
    vat: { type: Number, default: 0 },
    amount: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    status: { type: String, trim: true, default: "Pending" }, // for confirm action
  },
  { timestamps: true }
);

const DebitNote = model("DebitNote", debitNoteSchema);
export default DebitNote;
