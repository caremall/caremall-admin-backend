import Razorpay from "razorpay";
import Order from "../../models/Order.mjs";
import crypto from "crypto";
import Offer from "../../models/offerManagement.mjs";
import Address from "../../models/Address.mjs";
import Coupon from "../../models/coupon.mjs";
import Product from "../../models/Product.mjs";
import User from "../../models/User.mjs";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createOrder = async (req, res) => {
  try {
    const {
      items,
      shippingAddressId,
      billingAddressId,
      paymentMethod,
      totalAmount,
      couponCode,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items in order" });
    }

    // Fetch and validate shipping address
    const shippingAddressDoc = await Address.findById(shippingAddressId).lean();
    if (!shippingAddressDoc) {
      return res.status(400).json({ message: "Invalid shipping address" });
    }

    // Fetch and validate billing address or fallback to shipping
    let billingAddressDoc = null;
    if (billingAddressId) {
      billingAddressDoc = await Address.findById(billingAddressId).lean();
      if (!billingAddressDoc) {
        return res.status(400).json({ message: "Invalid billing address" });
      }
    }
    const finalBillingAddress = billingAddressDoc || shippingAddressDoc;

    // Format items for order
    const formattedItems = items.map((item) => ({
      product: item.product,
      variant: item.variant || null,
      quantity: item.quantity,
      priceAtOrder: item.priceAtOrder,
      totalPrice: item.totalPrice,
    }));

    if (paymentMethod !== "razorpay") {
      const bulkOps = formattedItems.map((item) => ({
        updateOne: {
          filter: { _id: item.product },
          update: { $inc: { orderCount: item.quantity } },
        },
      }));

      if (bulkOps.length) {
        await Product.bulkWrite(bulkOps);
      }
    }

    let finalAmount = Number(totalAmount);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({ message: "Invalid total amount" });
    }
    let appliedCoupon = null;

    // Apply coupon via Offer model
    if (couponCode?.trim()) {
      const coupon = await Coupon.findOne({
        code: couponCode.trim(),
        active: true,
      });

      if (!coupon) {
        return res
          .status(400)
          .json({ message: "Invalid or inactive coupon code" });
      }

      // Check expiry
      if (coupon.expiryDate && new Date() > coupon.expiryDate) {
        return res.status(400).json({ message: "Coupon has expired" });
      }

      // Check usage limit
      if (
        coupon.usageLimit !== null &&
        coupon.usageCount >= coupon.usageLimit
      ) {
        return res.status(400).json({ message: "Coupon usage limit exceeded" });
      }

      // Calculate discount
      let discount = 0;
      if (coupon.discountType === "percentage") {
        discount = (finalAmount * coupon.discountValue) / 100;
        if (coupon.maxDiscountAmount !== null) {
          discount = Math.min(discount, coupon.maxDiscountAmount);
        }
      } else if (coupon.discountType === "fixed") {
        discount = coupon.discountValue;
      }

      discount = Math.min(discount, finalAmount);
      finalAmount = finalAmount - discount;

      appliedCoupon = {
        couponId: coupon._id,
        couponCode: coupon.code,
        discountValue: discount,
      };

      // Increment usage count
      await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usageCount: 1 } });
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(finalAmount * 100), // convert to paise
      currency: "INR",
      receipt: `order_rcptid_${Date.now()}`,
    });

    // Create and save order in DB
    const order = await Order.create({
      user: req.user._id,
      items: formattedItems,
      shippingAddress: { ...shippingAddressDoc },
      billingAddress: { ...finalBillingAddress },
      paymentMethod,
      paymentStatus: "pending",
      totalAmount,
      finalAmount,
      appliedCoupon,
      razorpayOrderId: razorpayOrder.id,
    });

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order,
      razorpayOrderId: razorpayOrder.id,
    });
  } catch (error) {
    console.error("Create Order Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const verifyOrder = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const body = razorpayOrderId + "|" + razorpayPaymentId;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    // Update order in DB
    const order = await Order.findOneAndUpdate(
      { razorpayOrderId },
      {
        paymentStatus: "paid",
        razorpayPaymentId,
        razorpaySignature: razorpaySignature || null,
      },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Increment orderCount for each product
    const bulkOps = order.items.map((item) => ({
      updateOne: {
        filter: { _id: item.product },
        update: { $inc: { orderCount: item.quantity } },
      },
    }));

    if (bulkOps.length) {
      await Product.bulkWrite(bulkOps);
    }

    // Update user's first order status to false
    if (order.user) {
      const user = await User.findById(order.user);
      if (user && user.isFirstOrder) {
        user.isFirstOrder = false;
        await user.save();
      }
    }

    res.status(200).json({ success: true, order });
  } catch (err) {
    console.error("Verify Order Error:", err);
    res.status(500).json({ message: "Failed to verify order" });
  }
};

// export const verifyOrder = async (req, res) => {
//   try {
//     const { razorpayPaymentId, razorpayOrderId } = req.body;

//     if (!razorpayPaymentId || !razorpayOrderId) {
//       return res
//         .status(400)
//         .json({ message: "Payment ID and Order ID are required" });
//     }

//     // Fetch payment details from Razorpay API
//     const payment = await razorpay.payments.fetch(razorpayPaymentId);

//     // Check if payment status is 'captured' (success)
//     if (payment.status !== "captured") {
//       return res.status(400).json({ message: "Payment not completed" });
//     }

//     // Optionally verify if the payment belongs to the expected order
//     if (payment.order_id !== razorpayOrderId) {
//       return res
//         .status(400)
//         .json({ message: "Payment does not match order ID" });
//     }

//     // Update order in your database as paid
//     const order = await Order.findOneAndUpdate(
//       { razorpayOrderId },
//       {
//         paymentStatus: "paid",
//         razorpayPaymentId: payment.id,
//         razorpaySignature: null, // Since signature not used here
//       },
//       { new: true }
//     );

//     if (!order) {
//       return res.status(404).json({ message: "Order not found" });
//     }

//     res.status(200).json({ success: true, order });
//   } catch (error) {
//     console.error("Verify Order Without Signature Error:", error);
//     res.status(500).json({ message: "Failed to verify order payment" });
//   }
// };

export const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("items.product", "productName productImages urlSlug SKU")
      .populate("items.variant", "variantAttributes SKU images");

    res.status(200).json(orders);
  } catch (err) {
    console.error("Get User Orders Error:", err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id,
    })
      .populate("items.product", "productName productImages urlSlug SKU")
      .populate("items.variant", "variantAttributes SKU images");

    if (!order) return res.status(404).json({ message: "Order not found" });

    res.status(200).json(order);
  } catch (err) {
    console.error("Get Order Error:", err);
    res.status(500).json({ message: "Failed to fetch order" });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const { reason, remarks } = req.body; // 👈 take reason from request body

    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (
      order.orderStatus === "cancelled" ||
      order.orderStatus === "delivered"
    ) {
      return res.status(400).json({ message: "Cannot cancel this order" });
    }

    // ✅ update order status
    order.orderStatus = "cancelled";

    // ✅ save cancellation details
    order.cancellationDetails = {
      cancelledBy: req.user._id, // assuming user object is added by auth middleware
      cancelledAt: new Date(),
      reason,
      remarks,
    };

    await order.save();

    res
      .status(200)
      .json({ success: true, message: "Order cancelled successfully" });
  } catch (err) {
    console.error("Cancel Order Error:", err);
    res.status(500).json({ message: "Failed to cancel order" });
  }
};
