import mongoose from "mongoose";
const { Schema, model } = mongoose;

const carrierSchema = new Schema(
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
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    warehouse: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true, // optional, if every carrier must be assigned a warehouse
    },
    email: {
      type: String,
    },
  },
  { timestamps: true }
);

const Carrier = model("Carrier", carrierSchema);
export default Carrier;
