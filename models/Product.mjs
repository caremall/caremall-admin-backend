import { model, Schema } from "mongoose";

const productSchema = new Schema(
  {
    productId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    productName: { type: String, required: true, unique: true, trim: true },
    shortDescription: { type: String, required: true },
    productDescription: { type: String, required: true },
    brand: { type: Schema.Types.ObjectId, ref: "Brand", required: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    subcategory: { 
      type: Schema.Types.ObjectId, 
      ref: "Category", 
      required: false
    },
    warrantyPolicy: {
      type: String,
    },
    hasVariant: { type: Boolean, required: true },

    SKU: {
      type: String,
      required: function () {
        return this.hasVariant === false;
      },
    },

    barcode: {
      type: String,
    },

    defaultVariant: {
      type: Schema.Types.ObjectId,
      ref: "Variant",
    },

    productType: {
      type: Schema.Types.ObjectId,
      ref: "ProductType",
      required: function () {
        return this.hasVariant === true;
      },
    },

    productImages: {
      type: [String],
      required: function () {
        return this.hasVariant === false;
      },
    },

    tags: [String],

    costPrice: {
      type: Number,
      required: function () {
        return this.hasVariant === false;
      },
    },
    sellingPrice: {
      type: Number,
      required: function () {
        return this.hasVariant === false;
      }
    },
    mrpPrice: {
      type: Number,
      required: function () {
        return this.hasVariant === false;
      },
    },
    landingSellPrice: {
      type: Number,
      required: false,
      // set: function (v) {
      //   return Math.ceil(Number(v));
      // }
    },

    discountPercent: Number,
    taxRate: Number,

    productStatus: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    visibility: {
      type: String,
      enum: ["visible", "hidden"],
      default: "visible",
    },
    isFeatured: { type: Boolean, default: false },
    isPreOrder: { type: Boolean, default: false },

    availableQuantity: { type: Number, default: 0 },
    minimumQuantity: { type: Number, default: 0 },
    reorderQuantity: { type: Number, default: 0 },
    maximumQuantity: { type: Number, default: 0 },

    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
    },
    isFragile: Boolean,
    shippingClass: { type: String, trim: true },

    packageType: { type: String, trim: true },
    quantityPerBox: Number,

    supplierId: { type: String, trim: true },
    affiliateId: { type: String, trim: true },
    externalLinks: [String],

    metaTitle: String,
    metaDescription: String,
    urlSlug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
    addedToCartCount: {
      type: Number,
      default: 0,
    },
    wishlistCount: {
      type: Number,
      default: 0,
    },
    orderCount: {
      type: Number,
      default: 0,
    },
    warehouse: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: "true",
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);





// In your Product schema file
productSchema.virtual("variants", {
  ref: "Variant",
  localField: "_id",
  foreignField: "productId",
});

productSchema.virtual("reviews", {
  ref: "Review", // Review model name
  localField: "_id", // Product _id matches...
  foreignField: "productId", // ...Review.productId field
});

productSchema.virtual("inventory", {
  ref: "Inventory",
  localField: "_id",
  foreignField: "product",
  justOne: true,
});

productSchema.pre("validate", function () {
  if (!this.productId) {
    const prefix = "PROD";
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let randomPart = "";
    const length = 12;
    for (let i = 0; i < length; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.productId = prefix + randomPart;
  }
});

export default model("Product", productSchema);
