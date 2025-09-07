import mongoose from "mongoose";

const { Schema, model } = mongoose;

const warehouseLocationSchema = new Schema(
  {
    warehouse: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true, // e.g., "A1-01", "Bin-7"
    },
    name: {
      type: String,
      trim: true, // Human readable, e.g., "First Floor Rack A"
    },
    capacity:{
        type:Number,
        default:0
    },
    status: {
      type: String,
      enum: ["active", "inactive", "blocked"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

const WarehouseLocation = model("WarehouseLocation", warehouseLocationSchema);

export default WarehouseLocation;
