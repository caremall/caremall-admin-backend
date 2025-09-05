import mongoose from 'mongoose';

const { Schema, model } = mongoose;

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


export default model('Order', orderSchema);
