import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const variantSchema = new Schema(
  {
    variantId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variantAttributes: [
      {
        name: {
          type: String,
          required: true,
        },
        value: {
          type: String,
        },
      },
    ],

    SKU: {
      type: String,
      required: true,
      // unique: true,
    },

    barcode: {
      type: String,
      // unique: true,
    },

    costPrice: { type: Number, required: true },

    sellingPrice: { type: Number, required: true },

    mrpPrice: { type: Number, required: true },

    landingSellPrice: {
      type: Number,
      required: false,
      set: function (v) {
        return Math.ceil(Number(v));
      }
    },

    discountPercent: { type: Number },

     minimumQuantity: { 
      type: Number, 
      required: true, 
      default: 0 
    },
    reorderQuantity: { 
      type: Number, 
      required: true, 
      default: 0 
    },
    maximumQuantity: { 
      type: Number, 
      required: true, 
      default: 0 
    },

    taxRate: Number,

    images: [String],

    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

variantSchema.virtual("inventory", {
  ref: "Inventory",
  localField: "_id",
  foreignField: "variant",
  justOne: true,
});


variantSchema.pre("validate", function () {
  if (!this.variantId) {
    const prefix = "VAR";
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let randomPart = "";
    const length = 12;
    for (let i = 0; i < length; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.variantId = prefix + randomPart;
  }
});

variantSchema.pre("save", function (next) {
  if (this.mrpPrice && this.landingSellPrice) {
    const discount = ((this.mrpPrice - this.landingSellPrice) / this.mrpPrice) * 100;
    this.discountPercent = Math.round(discount);
  }
  next();
});


export default model('Variant', variantSchema);
