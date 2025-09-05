import mongoose from "mongoose";

const { Schema, model } = mongoose;

const inventoryLogSchema = new Schema(
  {
    inventory: {
      type: Schema.Types.ObjectId,
      ref: "Inventory",
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
    warehouse: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    previousQuantity: {
      type: Number,
      required: true,
    },
    quantityChange: {
      type: Number,
      required: true,
    },
    newQuantity: {
      type: Number,
      required: true,
    },
    reasonForUpdate: {
      type: String,
      required: true,
    },
    note: {
      type: String,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin", // or Admin model, whoever modifies inventory
    },
  },
  { timestamps: true }
);

export default model("InventoryLog", inventoryLogSchema);
