import Razorpay from "razorpay";
import Order from "../../models/Order.mjs";
import crypto from "crypto";
import Offer from "../../models/offerManagement.mjs";
import Address from "../../models/Address.mjs";
import Coupon from "../../models/coupon.mjs";

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

    let finalAmount = Number(totalAmount);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({ message: "Invalid total amount" });
    }
    let appliedCoupon = null;

    // Apply coupon via Offer model
    if (couponCode?.trim()) {
      const offer = await Offer.findOne({
        code: couponCode.trim(),
        offerStatus: "published",
      });

      if (!offer) {
        return res
          .status(400)
          .json({ message: "Invalid or inactive coupon code" });
      }

      // if (offer.usageLimit !== null && offer.usageCount >= offer.usageLimit) {
      //   return res.status(400).json({ message: "Coupon usage limit exceeded" });
      // }

      if (
        offer.offerRedeemTimePeriod &&
        offer.offerRedeemTimePeriod.length === 2 &&
        (new Date() < offer.offerRedeemTimePeriod[0] ||
          new Date() > offer.offerRedeemTimePeriod[1])
      ) {
        return res
          .status(400)
          .json({ message: "Coupon not redeemable at this time" });
      }

      // Calculate discount
      let discount = 0;
      if (offer.offerDiscountUnit === "percentage") {
        discount = (finalAmount * offer.offerDiscountValue) / 100;
        if (
          offer.maxDiscountAmount !== undefined &&
          offer.maxDiscountAmount !== null
        ) {
          discount = Math.min(discount, offer.maxDiscountAmount);
        }
      } else if (offer.offerDiscountUnit === "fixed") {
        discount = offer.offerDiscountValue;
      }

      discount = Math.min(discount, finalAmount);
      finalAmount = finalAmount - discount;

      appliedCoupon = {
        couponId: offer._id,
        couponCode: offer.code,
        discountValue: discount,
      };

      // Increment offer usage count
      await Offer.findByIdAndUpdate(offer._id, { $inc: { usageCount: 1 } });
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
      .populate("items.product", "productName productImages")
      .populate("items.variant", "variantAttributes");

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
      .populate("items.product", "productName productImages")
      .populate("items.variant", "variantAttributes");

    if (!order) return res.status(404).json({ message: "Order not found" });

    res.status(200).json(order);
  } catch (err) {
    console.error("Get Order Error:", err);
    res.status(500).json({ message: "Failed to fetch order" });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (
      order.orderStatus === "cancelled" ||
      order.orderStatus === "delivered"
    ) {
      return res.status(400).json({ message: "Cannot cancel this order" });
    }

    order.orderStatus = "cancelled";
    await order.save();

    res.status(200).json({ success: true, message: "Order cancelled" });
  } catch (err) {
    console.error("Cancel Order Error:", err);
    res.status(500).json({ message: "Failed to cancel order" });
  }
};
