import mongoose from "mongoose";

const { Schema, model } = mongoose;

const inventorySchema = new Schema(
  {
    warehouse: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    product: { type: Schema.Types.ObjectId, ref: "Product" }, // optional
    variant: { type: Schema.Types.ObjectId, ref: "Variant" }, // optional
    availableQuantity: { type: Number, required: true, default: 0 },
    minimumQuantity: { type: Number, required: true, default: 0 },
    reorderQuantity: { type: Number, required: true, default: 0 },
    maximumQuantity: { type: Number, required: true, default: 0 },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Custom validation to ensure either product or variant is present
inventorySchema.pre("validate", function (next) {
  if (!this.product && !this.variant) {
    next(new Error("Either product or variant must be specified"));
  } else {
    next();
  }
});

// Unique indexes to prevent duplicates per warehouse-product or warehouse-variant
inventorySchema.index(
  { warehouse: 1, product: 1 },
  { unique: true, partialFilterExpression: { product: { $exists: true } } }
);
inventorySchema.index(
  { warehouse: 1, variant: 1 },
  { unique: true, partialFilterExpression: { variant: { $exists: true } } }
);

const Inventory = model("Inventory", inventorySchema);

export default Inventory;
