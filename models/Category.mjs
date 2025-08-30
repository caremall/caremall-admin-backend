import mongoose, { Schema } from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Main", "Sub"],
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: undefined,
    },
    categoryCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
     warehouse: {
          type: Schema.Types.ObjectId,
          ref: "Warehouse",
        },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

categorySchema.virtual("products", {
  ref: "Product",
  localField: "_id",
  foreignField: "category",
});

categorySchema.virtual("subcategories", {
  ref: "Category",
  localField: "_id", 
  foreignField: "parentId", 
  justOne: false, 
});


export default mongoose.model('Category', categorySchema);
