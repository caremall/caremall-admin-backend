import mongoose from "mongoose";

const { Schema, model } = mongoose;

const damagedInventorySchema = new Schema(
  {
    warehouse: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
    },
    variant: {
      type: Schema.Types.ObjectId,
      ref: "Variant",
    },
    currentQuantity: {
      type: Number,
      required: true,
    },
    quantityToReport: {
      type: Number,
      required: true,
    },
    damageType: {
      type: String,
      required: true,
      enum: ["broken", "expired", "packaging", "other"], // expand as needed
    },
    note: {
      type: String,
    },
    evidenceImages: {
      type: [String], // store URLs or base64 strings of images
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin", // or Admin depending on system
      required: true,
    },
  },
  { timestamps: true }
);

export default model("DamagedInventory", damagedInventorySchema);
