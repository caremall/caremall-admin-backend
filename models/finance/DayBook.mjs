import mongoose from "mongoose";
const { Schema, model } = mongoose;

const dayBookSchema = new Schema(
  {
    type: { type: String, trim: true },
    date: { type: Date, required: true },
    reference: { type: String, trim: true },
    party: { type: Schema.Types.ObjectId, ref: "ChartOfAccount" },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    narration: { type: String, trim: true },
  },
  { timestamps: true }
);

const DayBook = model("DayBook", dayBookSchema);
export default DayBook;
