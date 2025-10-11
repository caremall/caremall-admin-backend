import mongoose from "mongoose";
const { Schema, model } = mongoose;

const pdcListSchema = new Schema(
  {
    type: { type: String, trim: true },
    documentNo: { type: String, trim: true },
    documentDate: { type: Date },
    chequeNo: { type: String, trim: true },
    narration: { type: String, trim: true },
    amount: { type: Number, default: 0 },
    status: { type: String, trim: true, default: "Pending" }, // Cleared / Pending
  },
  { timestamps: true }
);

const PDCList = model("PDCList", pdcListSchema);
export default PDCList;
