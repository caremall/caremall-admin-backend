import mongoose from "mongoose";
const { Schema, model } = mongoose;

const driverSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
    },
    location: {
      type: String,
      required: false,
    },
    vehicleNumber: {
      type: String,
      required: true,
      trim: true,
    },
    warehouse: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true, // optional, if every driver must be assigned a warehouse
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

const Driver = model("Driver", driverSchema);
export default Driver;
