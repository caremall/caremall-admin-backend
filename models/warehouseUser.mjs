// models/warehouseUser.mjs
import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const warehouseUserSchema = new Schema(
  {
    warehouse: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Warehouse is required'],
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: Number,
      required: [true, 'Phone is required'],
    },
    role: {
      type: String,
      enum: ['Picker', 'Packer', 'Other'],
      default: 'Other',
    },
  },
  { timestamps: true }
);

/* -------------------------------------------------
   UNIQUE PER WAREHOUSE (compound indexes)
   ------------------------------------------------- */
warehouseUserSchema.index({ warehouse: 1, email: 1 }, { unique: true });
warehouseUserSchema.index({ warehouse: 1, phone: 1 }, { unique: true });

/* -------------------------------------------------
   OPTIONAL: turn Mongo E11000 into a friendly message
   ------------------------------------------------- */
warehouseUserSchema.post('save', function (error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    const field = Object.keys(error.keyValue).find(k => k !== 'warehouse');
    next(new Error(`A user with this ${field} already exists in this warehouse`));
  } else {
    next(error);
  }
});

warehouseUserSchema.post('findOneAndUpdate', function (error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    const field = Object.keys(error.keyValue).find(k => k !== 'warehouse');
    next(new Error(`A user with this ${field} already exists in this warehouse`));
  } else {
    next(error);
  }
});

const WarehouseUser = model('WarehouseUser', warehouseUserSchema);
export default WarehouseUser;