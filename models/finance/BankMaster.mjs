import mongoose from "mongoose";
const { Schema, model } = mongoose;

const bankMasterSchema = new Schema(
  {
    code: { type: String, required: true, trim: true },
    bankName: { type: String, required: true, trim: true },
    ibanNo: { type: String, trim: true },
    glAccount: { type: Schema.Types.ObjectId, ref: "ChartOfAccount", required: true },
    accountNo: { type: String, trim: true },
    accountType: { type: String, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const BankMaster = model("BankMaster", bankMasterSchema);
export default BankMaster;
