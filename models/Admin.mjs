// models/Admin.mjs
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const adminSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    orders: [{ type: Schema.Types.ObjectId, ref: "Order" }],
    password: {
      type: String,
      required: true,
    },
    encryptedPassword: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended", "removed"],
      default: "active",
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

adminSchema.virtual("assignedWarehouses", {
  ref: "Warehouse", // model to use
  localField: "_id", // find warehouses where 'manager' matches admin _id
  foreignField: "manager",
  justOne: true, // set true if one warehouse per admin
});

const Admin = model('Admin', adminSchema);
export default Admin;
