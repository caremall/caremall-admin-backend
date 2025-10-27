import mongoose from "mongoose";

const { Schema, model } = mongoose;

const transferItemSchema = new Schema({
  quantity: Number,
  productId: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  variantId: {
    type: Schema.Types.ObjectId,
    ref: "Variant", 
    required: false,
    default: null 
  },
  totalWeight: {
    type: Number,
  },
}, {
  timestamps: true
});

const transferRequestSchema = new Schema({
  fromWarehouse: {
    type: Schema.Types.ObjectId,
    ref: "Warehouse",
    required: true,
  },
  toWarehouse: {
    type: Schema.Types.ObjectId,
    ref: "Warehouse",
    required: true,
  },
  carrier: {
    type: String,
  },
  dispatchTime: {
    type: Date,
  },
  pickStatus: {
    type: String,
    enum: ["pending", "picked"],
    default: "pending",
  },
  packStatus: {
    type: String,
    enum: ["pending", "packed"],
    default: "pending",
  },
  driver: {
    type: Schema.Types.ObjectId,
    ref: "Driver",
    required: true,
  },
  shippedAt: Date,
  receivedAt: Date,
  manifestStatus: {
    type: String,
    enum: ["pending", "in-transit", "delivered"],
    default: "pending",
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
  isConfirmed: {
    type: Boolean,
    default: false
  },
  confirmedAt: {
    type: Date
  },
  items: [transferItemSchema],
}, {
  timestamps: true
});


transferRequestSchema.pre("validate", function (next) {
  if (!this.items || this.items.length === 0) {
    return next(new Error("At least one item must be specified in transfer request"));
  }
  next();
});

const TransferRequest = model("TransferRequest", transferRequestSchema);

export default TransferRequest;