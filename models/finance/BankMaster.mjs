import mongoose from "mongoose";

const bankMasterSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    bankName: { type: String, required: true },
    ibanNo: { type: String },
    glAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChartOfAccount",
      required: true, // Bank must be linked to a GL account
    },
    accountNo: { type: String, required: true },
    accountType: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("BankMaster", bankMasterSchema);
