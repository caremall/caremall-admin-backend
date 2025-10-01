import mongoose from "mongoose";

const { Schema, model } = mongoose;
const pickItemSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  variant: {
    type: Schema.Types.ObjectId,
    ref: "Variant",
    default: null,
  },
  pickerName: { type: String, required: true },
  requiredQuantity: {
    type: Number,
    required: true,
    min: 1,
  },
  pickedQuantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  pickStatus: {
    type: String,
    enum: ["pending", "partial", "picked"],
    default: "pending",
  },
  pickerStatus: {
    type: String,
    enum: ["assigned", "un-assigned"],
    default: "un-assigned",
  },
});

const packSchema = new Schema({
  packerName: { type: String, required: true },
  packageWeight: { type: Number }, // kg
  packageLength: { type: Number }, // cm
  packageWidth: { type: Number }, // cm
  packageHeight: { type: Number }, // cm
  trackingNumber: { type: String },
  packagingMaterial: { type: String }, // box, polybag, etc.
  packStatus: {
    type: String,
    enum: ["pending", "packed"],
    default: "pending",
  },
  packingDate: { type: Date, default: Date.now },
  packingTime: { type: String }, // add this field explicitly
});

const dispatchSchema = new Schema(
  {
    carrier: { type: Schema.Types.ObjectId, ref: "Carrier" },
    driver: { type: Schema.Types.ObjectId, ref: "Driver" },
    vehicleNumber: { type: String },
    dispatchDate: { type: Date, default: Date.now },
    dispatchTime: { type: String },
    totalPackages: { type: Number },
    totalWeight: { type: Number },
    destinationHub: { type: String },
    toLocation: { type: String },
    manifestStatus: {
      type: String,
      enum: ["Pending", "In Transit", "Delivered"],
      default: "Pending",
    },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    items: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },

        variant: {
          type: Schema.Types.ObjectId,
          ref: "Variant",
          default: null,
        },

        quantity: {
          type: Number,
          required: true,
          min: 1,
        },

        priceAtOrder: {
          type: Number,
          required: true,
        },

        totalPrice: {
          type: Number,
          required: true,
        },
      },
    ],

    shippingAddress: {
      fullName: String,
      phone: String,
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
      landmark: String,
      district: String,
      mapLocation: {
        latitude: Number,
        longitude: Number,
      },
    },
    billingAddress: {
      fullName: String,
      phone: String,
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
      landmark: String,
      district: String,
      mapLocation: {
        latitude: Number,
        longitude: Number,
      },
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "card", "upi", "paypal"],
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },

    orderStatus: {
      type: String,
      enum: [
        "processing",
        "pending",
        "picked",
        "packed",
        "dispatched",
        "assigned",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "processing",
    },

    totalAmount: {
      type: Number,
      required: true,
    },
    finalAmount: {
      type: Number,
      required: true,
    },
    isDelivered: {
      type: Boolean,
      default: false,
    },
    appliedCoupon: {
      couponId: { type: Schema.Types.ObjectId, ref: "Coupon" },
      couponCode: { type: String },
      discountValue: { type: Number },
    },
    orderId: {
      type: String,
      unique: true,
    },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },

    deliveredAt: Date,
    allocatedWarehouse: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      default: null,
    },
    warehouseAllocationStatus: {
      type: String,
      enum: ["unallocated", "allocated"],
      default: "unallocated",
    },
    allocatedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin", // where User has role operationsmanager
      default: null,
    },
    allocatedAt: {
      type: Date,
      default: null,
    },
    pickings: [pickItemSchema],
    packings: [packSchema],
    dispatches: [dispatchSchema],
    cancellationDetails: {
      cancelledBy: { type: Schema.Types.ObjectId, ref: "User", required: false },
      cancelledAt: { type: Date, default: Date.now },
      reason: {
        type: String,
        required: function () {
          return this.orderStatus === 'cancelled';
        }
      },
      remarks: { type: String, required: false },
    }

  },
  { timestamps: true }
);

orderSchema.pre("save", async function (next) {
  if (!this.orderId) {
    const prefix = "#ORD";
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let randomPart = "";
    const length = 8;

    for (let i = 0; i < length; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    this.orderId = `${prefix}${randomPart}`;
  }
  next();
});

export default model("Order", orderSchema);
