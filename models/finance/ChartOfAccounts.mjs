import mongoose from "mongoose";

const chartOfAccountSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    accountType: { type: String, required: true },
    subType: { type: String },
    classification: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("ChartOfAccount", chartOfAccountSchema);
