import mongoose from "mongoose";
const { Schema, model } = mongoose;

const purchaseItemSchema = new Schema({
  barcode: String,
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  variant: { type: Schema.Types.ObjectId, ref: "Product", required: false },
  unit: String,
  batch: String,
  expiry: Date,
  quantity: { type: Number, required: true, min: 0 },
  rate: { type: Number, required: true, min: 0 }, // purchase rate
  sellingRate: { type: Number, default: 0 },
  vat: { type: Number, default: 0 },
  total: { type: Number, required: true },
  description: String,
});

const purchaseSchema = new Schema(
  {
    purchaseNumber: { type: String, required: true, unique: true },
    supplier: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
    warehouse: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    date: { type: Date, required: true },
    supplierRefNo: String,
    supplierRefDate: Date,
    items: [purchaseItemSchema],
    subTotal: { type: Number, default: 0 }, // sum of item totals
    totalVat: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    narration: String,
  },
  { timestamps: true }
);

const Purchase = model("Purchase", purchaseSchema);
export default Purchase;
