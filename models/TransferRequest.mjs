import mongoose from "mongoose";

const { Schema, model } = mongoose;

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
  totalWeight: {
    type: Number,
  },
 product: [
  {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  }
],
  quantityRequested: {
    type: Number,
    required: true,
  },
  quantityTransferred: {
    type: Number,
    default: 0,
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
    default: null,
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
});

// Custom validation: variant removed, so only product is required
transferRequestSchema.pre("validate", function (next) {
  if (!this.product) {
    return next(new Error("Product must be specified in transfer request"));
  }
  next();
});

const TransferRequest = model("TransferRequest", transferRequestSchema);

export default TransferRequest;
