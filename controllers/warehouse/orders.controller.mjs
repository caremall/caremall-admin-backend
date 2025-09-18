import Order from "../../models/Order.mjs";
import mongoose from "mongoose";

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
      .populate("items.product", "productName productImages SKU")
      .populate("items.variant", "variantAttributes")
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
      .populate("items.product", "productName SKU productImages")
      .populate("allocatedWarehouse")
      .populate("allocatedBy")
      .populate("items.variant", "variantName");

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

export const getAllocatedOrders = async (req, res) => {
  try {
    const warehouseId = req.user.assignedWarehouses?._id;

    if (!warehouseId) {
      return res
        .status(400)
        .json({ message: "No warehouse assigned to this user" });
    }

    const { search = "", status, startDate, endDate } = req.query;

    const query = { allocatedWarehouse: warehouseId };

    // Search by name or phone in shippingAddress (example)
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
        start.setHours(0, 0, 0, 0);
        query.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const orders = await Order.find(query)
      .populate("user")
      .populate("items.product")
      .populate("items.variant")
      .sort({ createdAt: -1 });

    res.status(200).json({ data: orders });
  } catch (error) {
    console.error("Get Allocated Orders Error:", error);
    res.status(500).json({ message: "Failed to fetch warehouse orders" });
  }
};

export const updatePickedQuantities = async (req, res) => {
  try {
    const orderId = req.params.id;

    // pickedItems: [{ pickItemId (productId), pickedQuantity, pickerName }]
    const { pickedItems, pickerName } = req.body;

    if (!Array.isArray(pickedItems) || pickedItems.length === 0) {
      return res
        .status(400)
        .json({ message: "pickedItems must be a non-empty array" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (!Array.isArray(order.pickings) || order.pickings.length === 0) {
      order.pickings = order.items.map((item) => ({
        product: item.product,
        variant: item.variant || null,
        requiredQuantity: item.quantity,
        pickedQuantity: 0,
        pickStatus: "pending",
        pickerName: pickerName || null, // default from request if provided
      }));
      order.markModified("pickings");
    }

    for (const { pickItemId, pickedQuantity, pickerName: itemPicker } of pickedItems) {
      if (!pickItemId || !mongoose.Types.ObjectId.isValid(pickItemId)) {
        return res
          .status(400)
          .json({ message: `Invalid product ID: ${pickItemId}` });
      }

      if (
        pickedQuantity === undefined ||
        typeof pickedQuantity !== "number" ||
        !Number.isInteger(pickedQuantity) ||
        pickedQuantity < 0
      ) {
        return res.status(400).json({
          message: `Invalid pickedQuantity for product ${pickItemId}: must be non-negative integer`,
        });
      }

      const pickItem = order.pickings.find(
        (pi) => pi.product.toString() === pickItemId
      );

      if (!pickItem) {
        return res
          .status(400)
          .json({ message: `Pick item with product id ${pickItemId} not found` });
      }

      if (pickedQuantity > pickItem.requiredQuantity) {
        return res.status(400).json({
          message: `Picked quantity ${pickedQuantity} exceeds required quantity ${pickItem.requiredQuantity} for product ${pickItemId}`,
        });
      }

      // ✅ Update fields
      pickItem.pickedQuantity = pickedQuantity;
      pickItem.pickerName = itemPicker || pickerName || pickItem.pickerName; // from item or global

      if (pickedQuantity === 0) pickItem.pickStatus = "pending";
      else if (pickedQuantity < pickItem.requiredQuantity)
        pickItem.pickStatus = "partial";
      else pickItem.pickStatus = "picked";
    }

    const allPicked =
      order.pickings.length > 0 &&
      order.pickings.every((pi) => pi.pickStatus === "picked");
    if (allPicked) order.orderStatus = "picked";

    await order.save();
    res
      .status(200)
      .json({ success: true, message: "Picking updated", data: order });
  } catch (error) {
    console.error("Update Picked Quantities Error:", error);
    res.status(500).json({ message: "Failed to update picked quantities" });
  }
};


export const updatePackedQuantities = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { packedItems, packerName } = req.body;
    // packedItems: [{ packItemId (productId), packedQuantity, packerName? }]

    if (!Array.isArray(packedItems) || packedItems.length === 0) {
      return res
        .status(400)
        .json({ message: "packedItems must be a non-empty array" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (!Array.isArray(order.packings) || order.packings.length === 0) {
      // initialize packings from pickings
      if (!order.pickings || order.pickings.length === 0) {
        return res.status(400).json({ message: "No picking data found" });
      }

      order.packings = order.pickings.map((pick) => ({
        product: pick.product,
        variant: pick.variant || null,
        pickedQuantity: pick.pickedQuantity, // ✅ base packing on picked quantity
        packedQuantity: 0,
        packStatus: "pending",
        packerName: packerName || null, // global default
      }));
      order.markModified("packings");
    }

    for (const { packItemId, packedQuantity, packerName: itemPacker } of packedItems) {
      if (!packItemId || !mongoose.Types.ObjectId.isValid(packItemId)) {
        return res
          .status(400)
          .json({ message: `Invalid product ID: ${packItemId}` });
      }

      if (
        packedQuantity === undefined ||
        typeof packedQuantity !== "number" ||
        !Number.isInteger(packedQuantity) ||
        packedQuantity < 0
      ) {
        return res.status(400).json({
          message: `Invalid packedQuantity for product ${packItemId}: must be non-negative integer`,
        });
      }

      const packItem = order.packings.find(
        (pa) => pa?.product && pa.product.toString() === String(packItemId)
      );

      if (!packItem) {
        return res
          .status(400)
          .json({ message: `Pack item with product id ${packItemId} not found` });
      }

      // ✅ validation against pickedQuantity
      if (packedQuantity > packItem.pickedQuantity) {
        return res.status(400).json({
          message: `Packed quantity ${packedQuantity} exceeds picked quantity ${packItem.pickedQuantity} for product ${packItemId}`,
        });
      }

      // ✅ update
      packItem.packedQuantity = packedQuantity;
      packItem.packerName = itemPacker || packerName || packItem.packerName; // item-level > global > existing

      if (packedQuantity === 0) packItem.packStatus = "pending";
      else if (packedQuantity < packItem.pickedQuantity)
        packItem.packStatus = "partial";
      else packItem.packStatus = "packed";
    }

    const allPacked =
      order.packings.length > 0 &&
      order.packings.every((pa) => pa.packStatus === "packed");
    if (allPacked) order.orderStatus = "packed";

    await order.save();
    res
      .status(200)
      .json({ success: true, message: "Packing updated", data: order });
  } catch (error) {
    console.error("Update Packed Quantities Error:", error);
    res.status(500).json({ message: "Failed to update packed quantities" });
  }
};

export const addPackingDetails = async (req, res) => {
  try {
    const orderId = req.params.id;
    const {
      packerName,
      packageWeight,
      packageLength,
      packageWidth,
      packageHeight,
      packingDate,
      trackingNumber,
      packagingMaterial,
    } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.packings.push({
      packerName,
      packageWeight,
      packageLength,
      packageWidth,
      packageHeight,
      packingDate: packingDate ? new Date(packingDate) : new Date(),
      trackingNumber,
      packagingMaterial,
      product: req.body.productId,       // required
      variant: req.body.variantId || null,
      pickedQuantity: req.body.pickedQuantity, // required
      packedQuantity: req.body.packedQuantity || 0,
    });


    order.orderStatus = "packed";

    await order.save();
    res
      .status(200)
      .json({ success: true, message: "Packing details added", data: order });
  } catch (error) {
    console.error("Add Packing Details Error:", error);
    res.status(500).json({ message: "Failed to add packing details" });
  }
};


export const markOrderDispatched = async (req, res) => {
  try {
    const orderId = req.params.id;
    const {
      carrier,
      driver,
      vehicleNumber,
      dispatchDate,
      dispatchTime,
      totalPackages,
      totalWeight,
      destinationHub,
      manifestStatus,
    } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const newDispatch = {
      carrier,
      driver,
      vehicleNumber,
      dispatchDate: dispatchDate ? new Date(dispatchDate) : new Date(),
      dispatchTime,
      totalPackages,
      totalWeight,
      destinationHub,
      manifestStatus: manifestStatus || "Pending",
    };

    order.dispatches.push(newDispatch); // push into dispatches array
    order.orderStatus = "dispatched";

    await order.save();

    res
      .status(200)
      .json({ success: true, message: "Order marked dispatched", data: order });
  } catch (error) {
    console.error("Mark Order Dispatched Error:", error);
    res.status(500).json({ message: "Failed to mark order as dispatched" });
  }
};
