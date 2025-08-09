import Razorpay from 'razorpay';
import Order from '../../models/Order.mjs'
import crypto from "crypto";

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

export const createOrder = async (req, res) => {
    const { items, shippingAddress, paymentMethod, totalAmount } = req.body;

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

    // const razorpayOrder = await razorpay.orders.create({
    //   amount: totalAmount * 100, // in paise
    //   currency: "INR",
    //   receipt: `order_rcptid_${Date.now()}`,
    // });

    const order = await Order.create({
      user: req.user._id,
      items: formattedItems,
      shippingAddress,
      paymentMethod,
      paymentStatus: "pending",
      totalAmount,
    //   razorpayOrderId: razorpayOrder.id,
    });

    res.status(201).json({
      success: true,
      order,
    //   razorpayOrder,
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
        razorpaySignature,
      },
      { new: true }
    );

    res.status(200).json({ success: true, order });
  } catch (err) {
    console.error("Verify Order Error:", err);
    res.status(500).json({ message: "Failed to verify order" });
  }
};

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
