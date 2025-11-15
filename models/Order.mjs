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
  pickerName: {
    type: Schema.Types.ObjectId,
    ref: "WarehouseUser",
    default: null,
  },
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
  reason: {
    type: String,
    enum: ["lowstock", "outofstock"],
  },
  pickerStatus: {
    type: String,
    enum: ["assigned", "un-assigned"],
    default: "un-assigned",
  },
});

const packItemSchema = new Schema({
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
});

const subPackedSchema = new Schema({
  packCode: { type: String }, 
  packerName: { type: String, required: true },
  packageWeight: { type: Number },
  packageLength: { type: Number }, 
  packageWidth: { type: Number }, 
  packageHeight: { type: Number }, 
  packagingMaterial: { type: String }, 
  packStatus: {
    type: String,
    enum: ["pending", "packed"],
    default: "pending",
  },
  items: [packItemSchema], 
  packingDate: { type: Date, default: Date.now },
  packingTime: { type: String },
});


const dispatchSchema = new Schema(
  {
    dispatchType: {
      type: String,
      enum: ["warehouse", "delivery_hub", "carrier", "rider"],
      required: true,
    },
    warehouse: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: function() {
        return this.dispatchType === "warehouse" || this.dispatchType === "delivery_hub";
      }
    },
   
    carrier: {
      type: Schema.Types.ObjectId,
      ref: "Carrier",
      required: function() {
        return this.dispatchType === "carrier";
      }
    },
    rider: {
      type: Schema.Types.ObjectId,
      ref: "DeliveryBoy",
      required: function() {
        return this.dispatchType === "rider";
      }
    },
    driver: {
      type: Schema.Types.ObjectId,
      ref: "Driver",
      required: function() {
        return this.dispatchType === "warehouse" || this.dispatchType === "delivery_hub";
      }
    },
    vehicleNumber: {
      type: String,
    },
    dispatchDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    dispatchTime: {
      type: String,
      required: true
    },
    destination: {
      type: String,
      required: true
    },
    totalPackages: {
      type: Number,
      required: true
    },
    totalWeight: {
      type: Number,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "in_transit", "delivered", "cancelled", "dispatched"],
      default: "pending"
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { _id: true, timestamps: true }
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
        refundAmount: { type: Number, default: 0 },
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
      ref: "Admin", 
      default: null,
    },
    allocatedAt: {
      type: Date,
      default: null,
    },
    isFirstOrderDiscountApplied: {
      type: Boolean,
      default: false,
    },
    pickings: [pickItemSchema],
    packings: [subPackedSchema], 
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