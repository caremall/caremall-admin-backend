import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const inboundItemSchema = new Schema({
  serialNo: Number,
  itemCode: { type: String, required: true },
  description: String,
  uom: String,
  packageType: String,
  packageNo: String,
  contain: Number,
  quantity: Number,
  containTimesQty: Number,
  weightUnit: String,
  weight: Number,
  batchNo: String,
  expiryDate: Date,
  hsCode: String,
  receivedQuantity: Number,
  excessQuantity: { type: Number, default: 0 },
  shortageQuantity: { type: Number, default: 0 },
  damageQuantity: { type: Number, default: 0 },
  damageRemarks: String,
  bin: String,
  receiveDate: Date,
});

const inboundJobSchema = new Schema(
  {
    jobType: { type: String, default: "WHJOB" },
    jobNumber: { type: String, required: true, unique: true },
    status: { type: String, default: "Opened" },
    date: { type: Date, required: true },
    supplier: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    allocatedLocation: {
      type: Schema.Types.ObjectId,
      ref: "WarehouseLocation",
      required: true,
    },
    warehouse: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    items: [inboundItemSchema],
  },
  { timestamps: true }
);

export default model('InboundJob', inboundJobSchema);
