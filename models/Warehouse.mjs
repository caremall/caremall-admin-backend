import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const warehouseSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["state warehouse", "district warehouse", "delivery hub"],
      required: true,
    },
    supportedSKUs: [
      {
        type: Schema.Types.ObjectId,
        ref: "Variant",
      },
    ],
    address: {
      street: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      pinCode: { type: String, required: true, trim: true },
    },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    manager: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    operatingHours: {
      startTime: { type: String, required: true }, // e.g., "08:00 AM"
      endTime: { type: String, required: true }, // e.g., "06:00 PM"
    },
    productCapacity: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Under Maintenance"],
      default: "Active",
    },
    warehouseLocation: {
      type: Schema.Types.ObjectId,
      ref: "WarehouseLocation",
    },
  },
  {
    timestamps: true,
  }
);

const Warehouse = model('Warehouse', warehouseSchema);
export default Warehouse;
