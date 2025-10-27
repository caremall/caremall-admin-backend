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
    damaged: {
      type: String,
      required: false,
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
      required: false,
    },
    quantityToReport:{
      type:Number,
      required:false
    },
    quantityChange: {
      type: Number,
      required: false,
    },
    newQuantity: {
      type: Number,
      required: false,
    },
    reasonForUpdate: {
      type: String,
      required: false,
    },
    reasonForDamage: {
      type: String,
      required: false,
    },
    damageType:{
      type:String,
      required: false
    },
    note: {
      type: String,
    },
    warehouseLocation: {
      type: Schema.Types.ObjectId,
      ref: "WarehouseLocation",
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin", 
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default model("InventoryLog", inventoryLogSchema);