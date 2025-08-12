import Razorpay from 'razorpay';
import Order from '../../models/Order.mjs'
import crypto from "crypto";
import Offer from '../../models/offerManagement.mjs';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createOrder = async (req, res) => {
    const { items, shippingAddress, paymentMethod, totalAmount, couponCode } =
      req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items in order" });
    }

    const formattedItems = items.map((item) => ({
      product: item.product,
      variant: item.variant || null,
      quantity: item.quantity,
      priceAtOrder: item.priceAtOrder,
      totalPrice: item.totalPrice,
    }));

    let finalAmount=totalAmount;
    let appliedOffer=null;

    if(couponCode) {
      const offer = await Offer.findOne({
        couponCode: couponCode.trim(),
        offerStatus: "published", // or 'active'
      });
      if (!offer) {
        return res
          .status(400)
          .json({ message: "Invalid or expired coupon code" });
      }
      if (
        offer.offerRedeemTimePeriod &&
        offer.offerRedeemTimePeriod.length === 2
      ) {
        const now = new Date();
        if (
          now < offer.offerRedeemTimePeriod[0] ||
          now > offer.offerRedeemTimePeriod[1]
        ) {
          return res
            .status(400)
            .json({ message: "Coupon is not valid at this time" });
        }
      }
      if (
        offer.offerMinimumOrderValue &&
        totalAmount < offer.offerMinimumOrderValue
      ) {
        return res.status(400).json({
          message: `Minimum order value for this coupon is ₹${offer.offerMinimumOrderValue}`,
        });
      }

      let discount = 0;
      if (offer.offerDiscountUnit === "percentage") {
        discount = (totalAmount * offer.offerDiscountValue) / 100;
      } else if (offer.offerDiscountUnit === "fixed") {
        discount = offer.offerDiscountValue;
      }

      // Ensure discount is not greater than total
      discount = Math.min(discount, totalAmount);

      finalAmount = totalAmount - discount;
      appliedOffer = {
        couponId: offer._id,
        couponCode: offer.couponCode,
        discountValue:discount,
        offerTitle: offer.offerTitle,
      };
    }


    const razorpayOrder = await razorpay.orders.create({
      amount: finalAmount * 100, // in paise
      currency: "INR",
      receipt: `order_rcptid_${Date.now()}`,
    });

    const order = await Order.create({
      user: req.user._id,
      items: formattedItems,
      shippingAddress,
      paymentMethod,
      paymentStatus: "pending",
      totalAmount,
      finalAmount,
      appliedOffer,
      razorpayOrderId: razorpayOrder.id,
    });

    res.status(201).json({
      success: true,
      order,
      razorpayOrderId: razorpayOrder.id,
    });
  
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
        razorpaySignature: razorpaySignature|| null, 
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
            .populate('items.product', 'productName productImages')
            .populate('items.variant', 'variantAttributes');

        res.status(200).json(orders);
    } catch (err) {
        console.error('Get User Orders Error:', err);
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
};


export const getOrderById = async (req, res) => {
    try {
        const order = await Order.findOne({ _id: req.params.id, user: req.user._id })
            .populate('items.product', 'productName productImages')
            .populate('items.variant', 'variantAttributes');

        if (!order) return res.status(404).json({ message: 'Order not found' });

        res.status(200).json(order);
    } catch (err) {
        console.error('Get Order Error:', err);
        res.status(500).json({ message: 'Failed to fetch order' });
    }
};


export const cancelOrder = async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            user: req.user._id,
        });

        if (!order) return res.status(404).json({ message: 'Order not found' });

        if (order.orderStatus === 'cancelled' || order.orderStatus === 'delivered') {
            return res.status(400).json({ message: 'Cannot cancel this order' });
        }

        order.orderStatus = 'cancelled';
        await order.save();

        res.status(200).json({ success: true, message: 'Order cancelled' });
    } catch (err) {
        console.error('Cancel Order Error:', err);
        res.status(500).json({ message: 'Failed to cancel order' });
    }
};
