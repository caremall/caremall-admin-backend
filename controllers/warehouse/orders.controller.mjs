import DeliveryBoy from "../../models/DeliveryBoy.mjs";
import Order from "../../models/Order.mjs";
import mongoose from "mongoose";

export const getAllOrders = async (req, res) => {
  try {
    const { search = "", status, startDate, endDate } = req.query;

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
    const warehouseId =
      req.user.assignedWarehouses?._id ||
      (Array.isArray(req.user.assignedWarehouses) &&
        req.user.assignedWarehouses.length > 0 &&
        req.user.assignedWarehouses[0]._id);

    if (!warehouseId) {
      return res
        .status(400)
        .json({ message: "No warehouse assigned to this warehouse" });
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
      .populate("dispatches.driver")
      .populate("dispatches.carrier")
      .populate("allocatedWarehouse")
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
    const { pickedItems } = req.body;

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
        pickerName: null,
        requiredQuantity: item.quantity,
        pickedQuantity: 0,
        pickStatus: "pending",
        pickerStatus: "un-assigned",
      }));
      order.markModified("pickings");
    }

    for (const { pickItemId, pickedQuantity, pickerName } of pickedItems) {
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

      if (
        !pickerName ||
        typeof pickerName !== "string" ||
        pickerName.trim() === ""
      ) {
        return res.status(400).json({
          message: `pickerName is required`,
        });
      }

      const pickItem = order.pickings.find(
        (pi) => pi.product.toString() === pickItemId
      );

      if (!pickItem) {
        return res.status(400).json({
          message: `Pick item with product id ${pickItemId} not found`,
        });
      }

      // ✅ Update fields
      pickItem.pickedQuantity = pickedQuantity;
      pickItem.pickerName = pickerName;
      pickItem.pickerStatus = "assigned";

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

// export const updatePackingDetails = async (req, res) => {
//   try {
//     const orderId = req.params.orderId;
//     const packingId = req.params.packingId; // Assumes packingId passed as a URL param
//     const { status } = req.query;
//     // Destructure fields that can be updated from request body
//     const {
//       packerName,
//       packageWeight,
//       packageLength,
//       packageWidth,
//       packageHeight,
//       packingDate,
//       packingTime,
//       trackingNumber,
//       packagingMaterial,
//     } = req.body;

//     // Find the order by ID
//     const order = await Order.findById(orderId);
//     if (!order) return res.status(404).json({ message: "Order not found" });

//     // Find the packing detail by packingId
//     const packing = order.packings.id(packingId);
//     if (!packing)
//       return res.status(404).json({ message: "Packing detail not found" });

//     // Update fields if provided in request body
//     if (packerName !== undefined) packing.packerName = packerName;
//     if (packageWeight !== undefined) packing.packageWeight = packageWeight;
//     if (packageLength !== undefined) packing.packageLength = packageLength;
//     if (packageWidth !== undefined) packing.packageWidth = packageWidth;
//     if (packageHeight !== undefined) packing.packageHeight = packageHeight;
//     if (packingDate !== undefined)
//       packing.packingDate = packingDate ? new Date(packingDate) : new Date();
//     if (packingTime !== undefined) packing.packingTime = packingTime;
//     if (trackingNumber !== undefined) packing.trackingNumber = trackingNumber;
//     if (packagingMaterial !== undefined)
//       packing.packagingMaterial = packagingMaterial;

//     order.orderStatus = status || "packed";

//     await order.save();

//     res
//       .status(200)
//       .json({ success: true, message: "Packing details updated", data: order });
//   } catch (error) {
//     console.error("Update Packing Details Error:", error);
//     res.status(500).json({ message: "Failed to update packing details" });
//   }
// };

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
      packingTime,
      trackingNumber,
      packagingMaterial,
    } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Replace or set the single packing detail object
    order.packings = {
      packerName,
      packageWeight,
      packageLength,
      packageWidth,
      packageHeight,
      packingDate: packingDate ? new Date(packingDate) : new Date(),
      trackingNumber,
      packagingMaterial,
      packingTime,
      packStatus: "packed",
    };

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
      toLocation
    } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const newDispatch = {
      carrier,
      driver: driver || null,
      vehicleNumber,
      dispatchDate: dispatchDate ? new Date(dispatchDate) : new Date(),
      dispatchTime,
      totalPackages,
      totalWeight,
      destinationHub,
      toLocation,
      manifestStatus: manifestStatus || "Pending",
    };

    order.dispatches.push(newDispatch); // push into dispatches array
    order.orderStatus = "dispatched";
    if (manifestStatus) {
      order.manifestStatus = manifestStatus; // update top-level manifest status
    } else {
      order.manifestStatus = "Pending";
    }

    await order.save();

    res
      .status(200)
      .json({ success: true, message: "Order marked dispatched", data: order });
  } catch (error) {
    console.error("Mark Order Dispatched Error:", error);
    res.status(500).json({ message: "Failed to mark order as dispatched" });
  }
};

export const markOrderCancelled = async (req, res) => {
  try {
    const { status, reason, remarks } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.orderStatus = status;

    // ✅ only add cancellation details if status is "cancelled"
    if (status === "cancelled") {
      order.cancellationDetails = {
        cancelledBy: req.warehouse?._id || null, // from admin auth middleware
        cancelledAt: new Date(),
        reason,
        remarks,
      };
    }

    await order.save();

    res.status(200).json({ message: "Order status updated", order });
  } catch (error) {
    console.error("Update Order Status Error:", error);
    res.status(500).json({ message: "Failed to update order status" });
  }
};

export const assignOrderToDeliveryBoy = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { deliveryBoyId } = req.body;

    if (!deliveryBoyId) {
      return res.status(400).json({ message: "deliveryBoyId is required" });
    }

    // Check if delivery boy exists
    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
    if (!deliveryBoy) {
      return res.status(404).json({ message: "Delivery boy not found" });
    }

    // Find order to assign
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Assign delivery boy
    order.deliveryBoy = deliveryBoyId;

    // Optionally update order status, e.g., assigned to delivery
    order.orderStatus = "assigned";

    await order.save();
    res.status(200).json({ message: "Order assigned to delivery boy" });
  } catch (error) {
    console.error("Assign Order to Delivery Boy Error:", error);
    res.status(500).json({ message: "Failed to assign order to delivery boy" });
  }
};
