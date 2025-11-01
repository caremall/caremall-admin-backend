import DeliveryBoy from "../../models/DeliveryBoy.mjs";
import inventory from "../../models/inventory.mjs";
import Order from "../../models/Order.mjs";
import mongoose from "mongoose";
// import {
//   ensureClientWarehouse,
//   createManifest,
//   getManifestStatus,
//   createPickupRequest,
// } from "../../utils/delhiveryB2B.js";

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

    const order = await Order.findById(req.params.id)
      .populate("allocatedWarehouse")
      .populate("items.product", "productName hasVariant");

    if (!order) return res.status(404).json({ message: "Order not found" });

    //     //     // if (status === "dispatched") {
    //     //     //   const wh = order.allocatedWarehouse;
    //     //     //   const consignee = order.shippingAddress;

    //     //     //   if (!wh) return res.status(400).json({ message: "Warehouse missing" });
    //     //     //   if (!order.items?.length)
    //     //     //     return res.status(400).json({ message: "Order has no items" });

    //     //     //   //  1. Create/Update warehouse
    //     //     //   await ensureClientWarehouse({
    //     //     //     name: wh.name,
    //     //     //     pin_code: wh.address.pinCode,
    //     //     //     city: wh.address.city,
    //     //     //     state: wh.address.state,
    //     //     //     country: wh.address.country || "India",
    //     //     //     address_details: {
    //     //     //       address: `${wh.address.street} ${wh.address.landmark || ""}`.trim(),
    //     //     //       contact_person: wh.contactPerson || wh.name,
    //     //     //       phone_number: wh.phone,
    //     //     //       email: wh.email,
    //     //     //     },
    //     //     //     ret_address: {
    //     //     //       pin: wh.returnAddress?.pin || wh.address.pinCode,
    //     //     //       address: wh.returnAddress?.address || wh.address.street,
    //     //     //       city: wh.returnAddress?.city || wh.address.city,
    //     //     //       state: wh.returnAddress?.state || wh.address.state,
    //     //     //       country: wh.returnAddress?.country || wh.address.country || "India",
    //     //     //     },
    //     //     //   });

    //     //     //   //  2. Prepare manifest-safe payloads
    //     //     //   const weightG = Math.max(
    //     //     //     100,
    //     //     //     Math.round((order.packings?.packageWeight || 0.5) * 1000)
    //     //     //   );

    //     //     //   const invoices = [
    //     //     //     {
    //     //     //       ewaybill: "",
    //     //     //       inv_num: order.invoiceNumber || `INV-${order.orderId}`,
    //     //     //       inv_amt: order.finalAmount,
    //     //     //       inv_qr_code: "",
    //     //     //     },
    //     //     //   ];

    //     //     //   const shipment_details = [
    //     //     //     {
    //     //     //       order_id: order.orderId || `ORD-${Date.now()}`,
    //     //     //       box_count: 1,
    //     //     //       description: order.items
    //     //     //         .map((i) => i.product?.productName || "Item")
    //     //     //         .join(", "),
    //     //     //       weight: weightG,
    //     //     //       waybills: [],
    //     //     //       master: false,
    //     //     //     },
    //     //     //   ];

    //     //     //   const dimensions = [
    //     //     //     {
    //     //     //       box_count: 1,
    //     //     //       length: Math.max(order.packings?.packageLength || 10, 1),
    //     //     //       width: Math.max(order.packings?.packageWidth || 10, 1),
    //     //     //       height: Math.max(order.packings?.packageHeight || 10, 1),
    //     //     //     },
    //     //     //   ];

    //     //     //   const billing_address = {
    //     //     //     name: wh.contactPerson || wh.name,
    //     //     //     company: wh.company || wh.name,
    //     //     //     consignor: wh.name,
    //     //     //     address: wh.address.street,
    //     //     //     city: wh.address.city,
    //     //     //     state: wh.address.state,
    //     //     //     pin: String(wh.address.pinCode),
    //     //     //     phone: wh.phone,
    //     //     //     pan_number: wh.pan || "",
    //     //     //     gst_number: wh.gst || "",
    //     //     //   };

    //     //     //   const dropoff_location = {
    //     //     //     consignee_name: consignee.fullName,
    //     //     //     address: `${consignee.addressLine1} ${
    //     //     //       consignee.addressLine2 || ""
    //     //     //     }`.trim(),
    //     //     //     city: consignee.city,
    //     //     //     state: consignee.state,
    //     //     //     zip: String(consignee.postalCode),
    //     //     //     phone: consignee.phone,
    //     //     //     email: consignee.email || "",
    //     //     //   };

    //     //     //   //  3. Create Manifest
    //     //     //   const manifestJob = await createManifest({
    //     //     //     pickup_location_name: wh.name,
    //     //     //     payment_mode: order.paymentMethod === "COD" ? "cod" : "prepaid",
    //     //     //     cod_amount: order.paymentMethod === "COD" ? order.finalAmount : 0,
    //     //     //     weight: Math.max((order.packings?.packageWeight || 0.5) * 1000, 100),
    //     //     //     dropoff_location,
    //     //     //     invoices,
    //     //     //     shipment_details,
    //     //     //     dimensions,
    //     //     //     billing_address,
    //     //     //   });

    //     //     //   //  4. Poll job status for LRNs
    //     //     //   const lrnInfo = await getManifestStatus(manifestJob.job_id);

    //     //     //   //  5. Create Pickup request
    //     //     //   const pickup_date = new Date().toISOString().slice(0, 10);
    //     //     //   const pur = await createPickupRequest({
    //     //     //     client_warehouse: wh.name,
    //     //     //     pickup_date,
    //     //     //     start_time: "10:00:00",
    //     //     //     expected_package_count: 1,
    //     //     //   });

    //     //     //   //  6. Save order
    //     //     //   order.orderStatus = "dispatched";
    //     //     //   order.dispatches.push({
    //     //     //     carrier: "Delhivery B2B",
    //     //     //     toLocation: consignee.city,
    //     //     //     totalPackages: 1,
    //     //     //     totalWeight: weightG / 1000,
    //     //     //     manifestStatus: "Requested",
    //     //     //     trackingNumber: lrnInfo?.lrns?.[0] || null,
    //     //     //   });
    //     //     //   await order.save();

    //     //     //   return res.status(200).json({
    //     //     //     message: "Order dispatched & synced to Delhivery B2B",
    //     //     //     manifest_job: manifestJob,
    //     //     //     manifest_status: lrnInfo,
    //     //     //     pickup_request: pur,
    //     //     //     order,
    //     //     //   });
    //     //     // }

    // ===== DISPATCH VALIDATION =====
    if (status === "dispatched") {
      if (!order.allocatedWarehouse) {
        return res
          .status(400)
          .json({ message: "Cannot dispatch — no warehouse allocated." });
      }

      const warehouseId = order.allocatedWarehouse._id;
      const insufficient = [];

      // Check stock before committing any changes
      for (const item of order.items) {
        const { product, variant, quantity } = item;

        const inventoryItem = await inventory.findOne({
          warehouse: warehouseId,
          product: product._id,
          variant: variant || null,
        });

        if (!inventoryItem) {
          insufficient.push({
            product: product.productName,
            reason: "No inventory record found",
          });
          continue;
        }

        if (inventoryItem.AvailableQuantity <= 0) {
          insufficient.push({
            product: product.productName,
            reason: "Out of stock",
          });
        } else if (inventoryItem.AvailableQuantity < quantity) {
          insufficient.push({
            product: product.productName,
            reason: `Only ${inventoryItem.AvailableQuantity} units left`,
          });
        }
      }

      // Stop if any product fails
      if (insufficient.length > 0) {
        return res.status(400).json({
          message:
            "Dispatch blocked. One or more items have insufficient stock.",
          details: insufficient,
        });
      }

      // ===== Deduct inventory now =====
      for (const item of order.items) {
        const { product, variant, quantity } = item;

        const inventoryItem = await inventory.findOne({
          warehouse: warehouseId,
          product: product._id,
          variant: variant || null,
        });

        inventoryItem.AvailableQuantity -= quantity;
        inventoryItem.updatedAt = new Date();
        await inventoryItem.save();
      }
    }

    // ===== UPDATE ORDER STATUS =====
    order.orderStatus = status;
    await order.save();

    res
      .status(200)
      .json({ message: "Order status updated successfully", order });
  } catch (error) {
    console.error(
      "Update Order Status Error:",
      error?.response?.data || error.message
    );
    res.status(500).json({
      message: "Failed to update order status",
      error: error?.response?.data || error.message,
    });
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
        .json({ message: "No warehouse assigned to this user" }); // Fixed message
    }

    const {
      search = "",
      status,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = req.query;

    const query = { allocatedWarehouse: warehouseId };

    // Search by name or phone in shippingAddress
    if (search) {
      query.$or = [
        { "shippingAddress.fullName": { $regex: search, $options: "i" } },
        { "shippingAddress.phone": { $regex: search, $options: "i" } },
        { orderId: { $regex: search, $options: "i" } }, // Also search by order ID
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

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const orders = await Order.find(query)
      .populate("user", "name email phone") // Select specific user fields
      .populate("dispatches.driver", "name phone")
      .populate("dispatches.carrier", "name trackingUrl")
      .populate("allocatedWarehouse", "name address")
      .populate("items.product", "name sku images")
      .populate("items.variant", "size color")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limitNum);

    // Transform response to include explicit status
    const ordersWithStatus = orders.map((order) => ({
      _id: order._id,
      orderId: order.orderId,
      orderStatus: order.orderStatus, // Explicitly including order status
      user: order.user,
      items: order.items,
      shippingAddress: order.shippingAddress,
      totalAmount: order.totalAmount,
      finalAmount: order.finalAmount,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      pickings: order.pickings,
      packings: order.packings,
      dispatches: order.dispatches,
      allocatedWarehouse: order.allocatedWarehouse,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));

    res.status(200).json({
      success: true,
      data: ordersWithStatus,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalOrders,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Get Allocated Orders Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch warehouse orders",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
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

      // Update fields
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
      toLocation,
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

    // only add cancellation details if status is "cancelled"
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
