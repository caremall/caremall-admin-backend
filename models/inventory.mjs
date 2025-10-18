import { model, Schema } from "mongoose";

const inventorySchema = new Schema(
  {
    warehouse: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: false,
      default: null, 
    },
    product: {  
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    variant: { 
      type: Schema.Types.ObjectId, 
      ref: "Variant",
      default: null
    },
    AvailableQuantity: { 
      type: Number, 
      required: true, 
      default: 0 
    },
    warehouseLocation: {
      type: Schema.Types.ObjectId,
      ref: "WarehouseLocation",
      default: null,
    },
    updatedAt: { 
      type: Date, 
      default: Date.now 
    },
  },
  { 
    timestamps: true
  }
);


inventorySchema.index(
  { warehouse: 1, product: 1, variant: 1 }, 
  { 
    unique: true,
    name: 'unique_warehouse_product_variant'
  }
);

export default model("Inventory", inventorySchema);