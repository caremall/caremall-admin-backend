import Order from "../../models/Order.mjs";

export const getAllOrders = async (req, res) => {
  try {
    const {
      search = "",
      status,
      startDate,
      endDate,
    } = req.query;

    const query = {};

    // Search by name or phone
    if (search) {
      query.$or = [
        { "shippingAddress.fullName": { $regex: search, $options: "i" } },
        { "shippingAddress.phone": { $regex: search, $options: "i" } },
      ];
    }

    // Filter by status
    if (status) {
      query.orderStatus = status;
    }

    // Filter by createdAt date range
    if (startDate || endDate) {
      query.createdAt = {};

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0); // Start of the day
        query.createdAt.$gte = start;
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // End of the day
        query.createdAt.$lte = end;
      }
    }

    const orders = await Order.find(query)
      .populate("user", "name email")
      .populate("items.product", "productName productImages urlSlug SKU")
      .populate("items.variant", "variantAttributes SKU images")
      .populate("allocatedWarehouse", "name location")
      .populate("allocatedBy", "fullName email")
      .sort({ createdAt: -1 });

    const total = await Order.countDocuments(query);

    res.status(200).json({
      data: orders,
    });
  } catch (error) {
    console.error("Get All Orders Error:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("items.product", "productName productImages urlSlug SKU")
      .populate("allocatedWarehouse")
      .populate("allocatedBy")
      .populate("items.variant", "images variantAttributes SKU");

    if (!order) return res.status(404).json({ message: "Order not found" });

    res.status(200).json(order);
  } catch (error) {
    console.error("Get Order By ID Error:", error);
    res.status(500).json({ message: "Failed to fetch order" });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: "Order not found" });

    order.orderStatus = status;
    await order.save();

    res.status(200).json({ message: "Order status updated", order });
  } catch (error) {
    console.error("Update Order Status Error:", error);
    res.status(500).json({ message: "Failed to update order status" });
  }
};

export const markOrderDelivered = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.isDelivered = true;
    order.deliveredAt = new Date();
    order.orderStatus = "delivered";
    await order.save();

    res.status(200).json({ message: "Order marked as delivered", order });
  } catch (error) {
    console.error("Mark Delivered Error:", error);
    res.status(500).json({ message: "Failed to mark as delivered" });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    await order.deleteOne();
    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Delete Order Error:", error);
    res.status(500).json({ message: "Failed to delete order" });
  }
};

export const allocateWarehouse = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { warehouseId } = req.body;
    const allocatedByUserId = req.user._id;
    if (!warehouseId || !allocatedByUserId) {
      return res
        .status(400)
        .json({ message: "warehouseId and allocatedByUserId are required" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Update order allocation details
    order.allocatedWarehouse = warehouseId;
    order.warehouseAllocationStatus = "allocated";
    order.allocatedBy = allocatedByUserId;
    order.allocatedAt = new Date();

    await order.save();

    res
      .status(200)
      .json({ message: "Warehouse allocated successfully", order });
  } catch (error) {
    console.error("Allocate Warehouse Error:", error);
    res.status(500).json({ message: "Failed to allocate warehouse" });
  }
};