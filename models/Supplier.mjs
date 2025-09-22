import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const supplierSchema = new Schema({
  supplierName: {
    type: String,
    required: true,
    trim: true,
  },
  contactName: {
    type: String,
    required: true,
    trim: true,
  },
  contactNumber: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
  },
  taxRegNo: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  pincode: {
    type: Number,
    required: true,
    trim: true,
  },
  image: {
    type: String,
  },
  warehouse: {
    type: Schema.Types.ObjectId,
    ref: "Warehouse",
  },
});

const Supplier = model("Supplier", supplierSchema);
export default Supplier;
