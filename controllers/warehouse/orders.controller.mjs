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
      .populate("items.product", "productName SKU productImages totalInventory")
      .populate("allocatedWarehouse")
      .populate("allocatedBy")
      .populate("items.variant", "SKU images variantAttributes variantName")
      .populate("pickings.pickerName", "name")
      .populate("pickings.product", "productName SKU")
      .populate("packings.items.product", "productName SKU totalInventory") // Populate packing items product details
      .populate("packings.items.variant", "SKU images variantAttributes variantName"); // Populate packing items variant details

    if (!order) return res.status(404).json({ message: "Order not found" });

    // Calculate packed quantities for each order item
    const orderWithPackedQuantities = {
      ...order.toObject(),
      items: order.items.map(item => {
        // Calculate total packed quantity for this specific order item
        const totalPacked = order.packings.reduce((sum, packing) => {
          let packedQty = 0;
          
          // Check both packing formats
          if (packing.items && packing.items.length > 0) {
            // New format with items array
            packing.items.forEach(packedItem => {
              const productMatch = packedItem.product?._id?.toString() === item.product._id.toString();
              const variantMatch = 
                (!packedItem.variant && !item.variant) || 
                (packedItem.variant && item.variant && packedItem.variant._id.toString() === item.variant._id.toString());
              
              if (productMatch && variantMatch) {
                packedQty += packedItem.quantity || 0;
              }
            });
          } else if (packing.product) {
            // Old format with direct product field
            const productMatch = packing.product.toString() === item.product._id.toString();
            const variantMatch = 
              (!packing.variant && !item.variant) || 
              (packing.variant && item.variant && packing.variant.toString() === item.variant._id.toString());
            
            if (productMatch && variantMatch) {
              packedQty += packing.quantity || 0;
            }
          }
          
          return sum + packedQty;
        }, 0);

        // Calculate remaining quantity (cannot pack more than ordered)
        const remainingQuantity = Math.max(0, item.quantity - totalPacked);

        return {
          ...item.toObject(),
          packedQuantity: totalPacked,
          remainingQuantity: remainingQuantity,
          isFullyPacked: remainingQuantity === 0,
          isOverPacked: totalPacked > item.quantity
        };
      }),
      // Enhanced packings with detailed product information
      packings: order.packings.map(packing => ({
        ...packing.toObject(),
        items: packing.items ? packing.items.map(item => ({
          ...item.toObject(),
          productName: item.product?.productName || 'Unknown Product',
          productSKU: item.product?.SKU || 'N/A',
          variantSKU: item.variant?.SKU || null,
          variantAttributes: item.variant?.variantAttributes || null,
          variantName: item.variant?.variantName || null
        })) : [],
        // For old format packings, create a virtual items array
        _legacyItems: !packing.items && packing.product ? [{
          product: packing.product,
          variant: packing.variant,
          quantity: packing.quantity,
          productName: 'Legacy Packing Item',
          productSKU: 'N/A'
        }] : []
      }))
    };

    console.log('Order packed quantities calculation:', {
      orderId: order.orderId,
      items: orderWithPackedQuantities.items.map(item => ({
        product: item.product.productName,
        ordered: item.quantity,
        packed: item.packedQuantity,
        remaining: item.remainingQuantity
      }))
    });

    res.status(200).json(orderWithPackedQuantities);
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



export const updatePickedQuantities = async (req,res) => {
    try {
        const orderId = req.params.id
        const { pickedItems } = req.body

        if (!Array.isArray(pickedItems) || pickedItems.length === 0) {
            return res.status(400).json({ message: "pickedItems must be a non-empty array" })
        }

        const order = await Order.findById(orderId).populate("items.product items.variant")
        if (!order) return res.status(404).json({ message: "Order not found" })

        // Initialize pickings if not exists
        if (!order.pickings || order.pickings.length === 0) {
            order.pickings = order.items.map((item) => ({
                product: item.product._id,
                variant: item.variant?._id || null,
                requiredQuantity: item.quantity,
                reason: null,
                pickedQuantity: 0,
                pickStatus: "pending",
                pickerStatus: "un-assigned",
                pickerName: null, // This should be ObjectId
            }))
            order.markModified("pickings")
        }

        for (const { productId, variantId, pickedQuantity, pickerId, reason } of pickedItems) {
            // Validate IDs
            if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
                return res.status(400).json({ message: `Invalid productId: ${productId}` })
            }

            if (variantId && !mongoose.Types.ObjectId.isValid(variantId)) {
                return res.status(400).json({ message: `Invalid variantId: ${variantId}` })
            }

            if (!pickerId || !mongoose.Types.ObjectId.isValid(pickerId)) {
                return res.status(400).json({ message: `Invalid pickerId: ${pickerId}` })
            }

            if (typeof pickedQuantity !== "number" || !Number.isInteger(pickedQuantity) || pickedQuantity < 0) {
                return res.status(400).json({ message: "pickedQuantity must be a non-negative integer" })
            }

            // Find pick item: variant first, then product
            const pickItem = order.pickings.find((pi) => {
                if (variantId) {
                    return pi.variant && pi.variant.toString() === variantId
                }
                return pi.product.toString() === productId
            })

            if (!pickItem) {
                const type = variantId ? `variant ${variantId}` : `product ${productId}`
                return res.status(400).json({ message: `Pick item not found for ${type}` })
            }

            // Update
            pickItem.pickedQuantity = pickedQuantity
            pickItem.pickerName = pickerId // Store ObjectId
            pickItem.pickerStatus = "assigned"

            // Set reason only for outofstock or lowstock status
            if (reason && (reason === "outofstock" || reason === "lowstock")) {
                pickItem.reason = reason;
            } else {
                pickItem.reason = null;
            }

            // Update pick status
            if (pickedQuantity === 0) {
                pickItem.pickStatus = "pending"
            } else if (pickedQuantity < pickItem.requiredQuantity) {
                pickItem.pickStatus = "partial"
            } else {
                pickItem.pickStatus = "picked"
            }
        }

        // Update order status
        const allPicked = order.pickings.every((pi) => pi.pickStatus === "picked")
        if (allPicked) {
            order.orderStatus = "picked"
        }

        await order.save()

        // Populate pickerName before sending response
        const populatedOrder = await Order.findById(orderId)
            .populate("items.product items.variant")
            .populate("pickings.pickerName", "name email") // Populate picker details

        return res.status(200).json({
            success: true,
            message: "Picking updated successfully",
            data: populatedOrder,
        })
    } catch (error) {
        console.error("Update Picked Quantities Error:", error)
        return res.status(500).json({ message: "Internal server error", error: error.message })
    }
}




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
    const { packingDate, subPacks = [] } = req.body;
    console.log("Received packing request:", { orderId, packingDate, subPacks });
    if (!Array.isArray(subPacks) || subPacks.length === 0) {
      return res.status(400).json({
        message: "subPacks array is required and cannot be empty",
      });
    }
    // Find order WITHOUT populating items.product and items.variant
    // This keeps them as ObjectIds for easier comparison
    const order = await Order.findById(orderId)
      .populate("pickings.product")
      .populate("pickings.variant");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    console.log("Order items:", order.items);
    console.log("Order pickings:", order.pickings);

    if (!order.packings) order.packings = [];

    const newPackCodes = [];

    // Process each sub-pack
    for (const subPack of subPacks) {
      const {
        packerName,
        packageWeight,
        packageLength,
        packageWidth,
        packageHeight,
        packagingMaterial,
        items = [],
        confirm = false,
      } = subPack;

      if (!packerName || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          message: "packerName and non-empty items array are required for each sub-pack",
        });
      }

      let packCode = null;
      let packStatus = "pending";

      // Generate pack code only if confirmed
      if (confirm) {
        const existingCodes = order.packings
          .filter((p) => p.packCode && p.packCode.startsWith("PACK"))
          .map((p) => {
            const num = p.packCode.replace("PACK", "");
            return parseInt(num, 10);
          });

        const nextNum = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 0;
        packCode = `PACK${String(nextNum).padStart(3, "0")}`;
        packStatus = "packed";
        newPackCodes.push(packCode);
      }

      const packItems = [];

      // Validate and process each item in sub-pack
      for (const item of items) {
        const { productId, variantId, quantity } = item;

        if (!productId || !quantity || quantity < 1) {
          return res.status(400).json({
            message: "productId and valid quantity (>=1) are required for each item",
          });
        }

        console.log(`Looking for product: ${productId} in order items`);

        // Find matching order item - compare as strings
        const orderItem = order.items.find((oi) => {
          const productMatch = oi.product.toString() === productId;
          let variantMatch = true;
          
          if (variantId) {
            variantMatch = oi.variant && oi.variant.toString() === variantId;
          } else {
            variantMatch = !oi.variant; // Both should be null/undefined
          }
          
          return productMatch && variantMatch;
        });

        if (!orderItem) {
          console.log(`Product ${productId} not found in order items. Available items:`, 
            order.items.map(oi => ({ product: oi.product.toString(), variant: oi.variant?.toString() }))
          );
          return res.status(400).json({
            message: `Product ${productId}${variantId ? ` (variant: ${variantId})` : ""} not found in order`,
          });
        }

        console.log(`Found order item for product ${productId}:`, orderItem);

        // Check if picked
        const picking = order.pickings.find((p) => {
          const productMatch = p.product && p.product._id.toString() === productId;
          let variantMatch = true;
          
          if (variantId) {
            variantMatch = p.variant && p.variant._id.toString() === variantId;
          } else {
            variantMatch = !p.variant; // Both should be null/undefined
          }
          
          return productMatch && variantMatch;
        });

        if (!picking) {
          return res.status(400).json({
            message: `Product ${productId} not found in pickings`,
          });
        }

        if (picking.pickStatus !== "picked") {
          return res.status(400).json({
            message: `Product ${productId} must be fully picked before packing. Current status: ${picking.pickStatus}`,
          });
        }

        // Calculate already packed quantity for this product/variant
        const alreadyPacked = order.packings.reduce((sum, packing) => {
          let itemPackedQty = 0;
          
          // Check if packing has items array (new format)
          if (packing.items && packing.items.length > 0) {
            const packedItem = packing.items.find((pi) => {
              const productMatch = pi.product.toString() === productId;
              let variantMatch = true;
              
              if (variantId) {
                variantMatch = pi.variant && pi.variant.toString() === variantId;
              } else {
                variantMatch = !pi.variant;
              }
              
              return productMatch && variantMatch;
            });
            itemPackedQty = packedItem ? packedItem.quantity : 0;
          }
          // Old format (direct product/variant fields)
          else if (packing.product) {
            const productMatch = packing.product.toString() === productId;
            let variantMatch = true;
            
            if (variantId) {
              variantMatch = packing.variant && packing.variant.toString() === variantId;
            } else {
              variantMatch = !packing.variant;
            }
            
            if (productMatch && variantMatch) {
              itemPackedQty = packing.packedQuantity || packing.quantity || 0;
            }
          }
          
          return sum + itemPackedQty;
        }, 0);

        const remaining = orderItem.quantity - alreadyPacked;

        console.log(`Product ${productId} - Ordered: ${orderItem.quantity}, Already packed: ${alreadyPacked}, Remaining: ${remaining}, Trying to pack: ${quantity}`);

        if (quantity > remaining) {
          return res.status(400).json({
            message: `Cannot pack ${quantity} of product ${productId}. Only ${remaining} remaining (Ordered: ${orderItem.quantity}, Packed: ${alreadyPacked})`,
          });
        }

        // Add to pack items
        packItems.push({
          product: productId,
          variant: variantId || null,
          quantity,
        });
      }

      // Create packing entry
      const packingEntry = {
        packCode,
        packerName,
        packageWeight,
        packageLength,
        packageWidth,
        packageHeight,
        packagingMaterial,
        packStatus,
        items: packItems,
        packingDate: packingDate ? new Date(packingDate) : new Date(),
        packingTime: new Date().toTimeString().split(" ")[0],
      };

      order.packings.push(packingEntry);
      console.log(`Added packing entry with ${packItems.length} items`);
    }

    // Check if ALL order items are fully packed
    const allFullyPacked = order.items.every((orderItem) => {
      const totalPacked = order.packings.reduce((sum, packing) => {
        let packedQty = 0;
        
        if (packing.items && packing.items.length > 0) {
          const packedItem = packing.items.find((pi) => {
            const productMatch = pi.product.toString() === orderItem.product.toString();
            let variantMatch = true;
            
            if (orderItem.variant) {
              variantMatch = pi.variant && pi.variant.toString() === orderItem.variant.toString();
            } else {
              variantMatch = !pi.variant;
            }
            
            return productMatch && variantMatch;
          });
          packedQty = packedItem ? packedItem.quantity : 0;
        }
        
        return sum + packedQty;
      }, 0);

      const isFullyPacked = totalPacked >= orderItem.quantity;
      console.log(`Product ${orderItem.product.toString()} - Ordered: ${orderItem.quantity}, Packed: ${totalPacked}, Fully packed: ${isFullyPacked}`);
      
      return isFullyPacked;
    });

    // Update order status only if fully packed
    if (allFullyPacked && order.orderStatus !== "packed") {
      order.orderStatus = "packed";
      console.log(`Order ${orderId} status updated to: packed`);
    }

    // Save order
    await order.save();
    console.log(`Order saved successfully with ${order.packings.length} packings`);

    // Success response
    return res.status(200).json({
      success: true,
      message: "Packing details added successfully",
      newPackCodes,
      allItemsPacked: allFullyPacked,
      orderStatus: order.orderStatus,
      data: order,
    });
  } catch (error) {
    console.error("Add Packing Details Error:", error);
    return res.status(500).json({
      message: "Failed to add packing details",
      error: error.message,
    });
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





export const getOutOfStockOrders = async (req, res) => {
  try {
    const assignedWarehouses = req.user.assignedWarehouses;

    // Validate warehouse assignment
    if (!assignedWarehouses || !Array.isArray(assignedWarehouses) || assignedWarehouses.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No warehouse assigned to user",
      });
    }

    // Convert warehouse ID to ObjectId
    const fromWarehouse = new mongoose.Types.ObjectId(assignedWarehouses[0]._id);
    const validReasons = ["lowstock", "outofstock"];

    console.log("Querying orders for warehouse:", fromWarehouse);

    // Query orders with out-of-stock pickings
    const orders = await Order.find({
      allocatedWarehouse: fromWarehouse,
      "pickings.reason": { $in: validReasons },
    })
      .select("orderId shippingAddress.fullName pickings _id")
      .populate({
        path: "pickings.product",
        select: "productName",
      })
      .populate({
        path: "pickings.variant",
        select: "SKU",
      })
      .lean();

    console.log("Found orders:", orders.length);

    // Format response
    const result = orders.map((order) => {
      const outOfStockItems = order.pickings
        .filter((item) => item.reason && validReasons.includes(item.reason))
        .map((item) => ({
          productName: item.product?.productName || "Unknown Product",
          variantSKU: item.variant?.SKU || "N/A",
          requiredQuantity: item.requiredQuantity,
          pickedQuantity: item.pickedQuantity,
          reason: item.reason,
        }));

      return {
        _id: order._id, // Include the MongoDB _id
        orderId: order.orderId,
        customerName: order.shippingAddress?.fullName || "N/A",
        outOfStockItems,
      };
    });

    return res.status(200).json({
      success: true,
      data: result,
      count: result.length,
    });
  } catch (error) {
    console.error("Error in getOutOfStockOrders:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};







export const getOutOfStockOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const assignedWarehouses = req.user.assignedWarehouses;

    if (!assignedWarehouses || assignedWarehouses.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No warehouse assigned to user",
      });
    }

    const fromWarehouse = new mongoose.Types.ObjectId(assignedWarehouses[0]._id);
    const validReasons = ["lowstock", "outofstock"];

    const order = await Order.findOne({
      _id: new mongoose.Types.ObjectId(id),
      allocatedWarehouse: fromWarehouse,
      "pickings.reason": { $in: validReasons },
    })
      .populate({
        path: "pickings.product",
        select: "productName productImages SKU", // SKU from product (for non-variant)
      })
      .populate({
        path: "pickings.variant",
        select: "SKU images _id", // variant details
      })
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or no out-of-stock items in your warehouse",
      });
    }

    const outOfStockItems = order.pickings
      .filter(item => item.reason && validReasons.includes(item.reason))
      .map(item => {
        const hasVariant = !!item.variant;

        return {
          // Always send correct IDs
          productId: item.product?._id?.toString(),
          variantId: hasVariant ? item.variant?._id?.toString() : null,

          productName: item.product?.productName || "Unknown Product",

          // SKU Logic: Use variant SKU if exists, otherwise use product SKU
          SKU: hasVariant 
            ? (item.variant?.SKU || "N/A") 
            : (item.product?.SKU || "N/A"),

          // Images: Use variant images if exists, otherwise use product images
          productImage: hasVariant 
            ? (item.variant?.images?.[0] || item.product?.productImages?.[0] || null)
            : (item.product?.productImages?.[0] || null),

          requiredQuantity: item.requiredQuantity,
          pickedQuantity: item.pickedQuantity || 0,
          packedQuantity: item.packedQuantity || 0,

          reason: item.reason,
          pickerId: item.pickerName?._id?.toString() || null,
          pickerName: item.pickerName?.name || "",
        };
      });

    return res.status(200).json({
      success: true,
      data: {
        _id: order._id.toString(),
        orderId: order.orderId,
        customerName: order.shippingAddress?.fullName || "N/A",
        outOfStockItems,
      },
    });
  } catch (error) {
    console.error("Error in getOutOfStockOrderById:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const getDispatchOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("items.product", "productName SKU productImages weight")
      .populate("allocatedWarehouse", "name address")
      .populate("allocatedBy", "fullName email")
      .populate("items.variant", "SKU images variantAttributes variantName weight")
      .populate("pickings.pickerName", "name")
      .populate("pickings.product", "productName SKU")
      .populate("packings.items.product", "productName SKU weight")
      .populate("packings.items.variant", "SKU images variantAttributes variantName weight")
      .populate("dispatches.carrier", "name contactInfo")
      .populate("dispatches.driver", "name phone")
      .populate("dispatches.rider", "name phone") // Fixed: changed 'Rider' to 'rider'

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Calculate dispatch metrics
    const dispatchMetrics = calculateDispatchMetrics(order);

    // Enhanced order response with dispatch information
    const enhancedOrder = {
      ...order.toObject(),
      // Basic order information
      orderSummary: {
        orderId: order.orderId,
        customerName: order.user?.name || 'N/A',
        customerEmail: order.user?.email || 'N/A',
        customerPhone: order.user?.phone || 'N/A',
        shippingAddress: order.shippingAddress,
        totalAmount: order.totalAmount,
        finalAmount: order.finalAmount,
        orderStatus: order.orderStatus,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        warehouse: order.allocatedWarehouse?.name || 'N/A',
      },
      // Packing information with detailed calculations
      packingSummary: {
        totalPackages: dispatchMetrics.totalPackages,
        totalWeight: dispatchMetrics.totalWeight,
        totalVolume: dispatchMetrics.totalVolume,
        averagePackageWeight: dispatchMetrics.averagePackageWeight,
        packingEfficiency: dispatchMetrics.packingEfficiency,
      },
      // Detailed package information
      packages: dispatchMetrics.packages,
      // Product summary
      productSummary: dispatchMetrics.productSummary,
      // Dispatch readiness check
      dispatchReadiness: {
        isReadyForDispatch: dispatchMetrics.isReadyForDispatch,
        allItemsPacked: dispatchMetrics.allItemsPacked,
        missingItems: dispatchMetrics.missingItems,
        readyPackages: dispatchMetrics.readyPackages,
        pendingPackages: dispatchMetrics.pendingPackages,
      }
    };

    res.status(200).json(enhancedOrder);
  } catch (error) {
    console.error("Get Dispatch Order By ID Error:", error);
    res.status(500).json({ 
      message: "Failed to fetch order for dispatch",
      error: error.message 
    });
  }
};

// Helper function to calculate dispatch metrics
const calculateDispatchMetrics = (order) => {
  // Package-level calculations
  const packages = order.packings.map((packing, index) => {
    const packageWeight = packing.packageWeight || 0;
    const packageVolume = (packing.packageLength || 0) * (packing.packageWidth || 0) * (packing.packageHeight || 0) / 1000; // in liters
    
    // Calculate items weight (sum of product weights * quantities)
    let itemsWeight = 0;
    let itemsCount = 0;
    
    if (packing.items && packing.items.length > 0) {
      packing.items.forEach(item => {
        const productWeight = item.product?.weight || 0;
        const variantWeight = item.variant?.weight || 0;
        const itemWeight = variantWeight > 0 ? variantWeight : productWeight;
        itemsWeight += itemWeight * item.quantity;
        itemsCount += item.quantity;
      });
    }

    // Package status
    const packStatus = packing.packStatus || 'pending';
    const isReady = packStatus === 'packed' && packing.trackingNumber;

    return {
      packageNumber: index + 1,
      packCode: packing.packCode || `PACK${String(index + 1).padStart(3, '0')}`,
      packerName: packing.packerName,
      packStatus: packStatus,
      isReadyForDispatch: isReady,
      trackingNumber: packing.trackingNumber,
      packagingMaterial: packing.packagingMaterial,
      // Weight information
      packageWeight: packageWeight,
      itemsWeight: itemsWeight,
      totalWeight: packageWeight + itemsWeight,
      // Dimensions
      dimensions: {
        length: packing.packageLength,
        width: packing.packageWidth,
        height: packing.packageHeight,
        volume: packageVolume,
      },
      // Items in package
      items: packing.items ? packing.items.map(item => ({
        productName: item.product?.productName || 'Unknown Product',
        productSKU: item.product?.SKU || 'N/A',
        variantName: item.variant?.variantName || null,
        variantSKU: item.variant?.SKU || null,
        quantity: item.quantity,
        unitWeight: item.variant?.weight || item.product?.weight || 0,
        totalWeight: (item.variant?.weight || item.product?.weight || 0) * item.quantity,
      })) : [],
      itemsCount: itemsCount,
      packingDate: packing.packingDate,
      packingTime: packing.packingTime,
    };
  });

  // Total calculations
  const totalPackages = packages.length;
  const totalWeight = packages.reduce((sum, pkg) => sum + pkg.totalWeight, 0);
  const totalVolume = packages.reduce((sum, pkg) => sum + (pkg.dimensions.volume || 0), 0);
  const averagePackageWeight = totalPackages > 0 ? totalWeight / totalPackages : 0;
  
  // Packing efficiency (items weight vs packaging weight)
  const totalItemsWeight = packages.reduce((sum, pkg) => sum + pkg.itemsWeight, 0);
  const totalPackagingWeight = packages.reduce((sum, pkg) => sum + pkg.packageWeight, 0);
  const packingEfficiency = totalItemsWeight > 0 ? 
    (totalItemsWeight / (totalItemsWeight + totalPackagingWeight)) * 100 : 0;

  // Product summary across all packages
  const productSummary = {};
  order.packings.forEach(packing => {
    if (packing.items) {
      packing.items.forEach(item => {
        const productKey = item.product?._id?.toString();
        const variantKey = item.variant?._id?.toString();
        const key = variantKey ? `${productKey}_${variantKey}` : productKey;
        
        if (!productSummary[key]) {
          productSummary[key] = {
            productName: item.product?.productName || 'Unknown',
            productSKU: item.product?.SKU || 'N/A',
            variantName: item.variant?.variantName || null,
            variantSKU: item.variant?.SKU || null,
            totalPacked: 0,
            totalWeight: 0,
          };
        }
        
        productSummary[key].totalPacked += item.quantity;
        const unitWeight = item.variant?.weight || item.product?.weight || 0;
        productSummary[key].totalWeight += unitWeight * item.quantity;
      });
    }
  });

  // Dispatch readiness check
  const readyPackages = packages.filter(pkg => pkg.isReadyForDispatch).length;
  const pendingPackages = packages.filter(pkg => !pkg.isReadyForDispatch).length;
  
  // Check if all ordered items are packed
  const orderedItems = order.items || [];
  const packedItems = {};
  
  // Calculate total packed quantity for each product-variant
  order.packings.forEach(packing => {
    if (packing.items) {
      packing.items.forEach(item => {
        const productId = item.product?._id?.toString();
        const variantId = item.variant?._id?.toString();
        const key = variantId ? `${productId}_${variantId}` : productId;
        
        packedItems[key] = (packedItems[key] || 0) + item.quantity;
      });
    }
  });

  // Find missing items
  const missingItems = orderedItems.map(item => {
    const productId = item.product?._id?.toString();
    const variantId = item.variant?._id?.toString();
    const key = variantId ? `${productId}_${variantId}` : productId;
    
    const packedQuantity = packedItems[key] || 0;
    const remainingQuantity = Math.max(0, item.quantity - packedQuantity);
    
    return {
      productName: item.product?.productName || 'Unknown',
      variantName: item.variant?.variantName || null,
      orderedQuantity: item.quantity,
      packedQuantity: packedQuantity,
      remainingQuantity: remainingQuantity,
      isFullyPacked: remainingQuantity === 0,
    };
  }).filter(item => item.remainingQuantity > 0);

  const allItemsPacked = missingItems.length === 0;
  const isReadyForDispatch = allItemsPacked && readyPackages > 0;

  return {
    totalPackages,
    totalWeight,
    totalVolume,
    averagePackageWeight,
    packingEfficiency: Math.round(packingEfficiency * 100) / 100,
    packages,
    productSummary: Object.values(productSummary),
    isReadyForDispatch,
    allItemsPacked,
    missingItems,
    readyPackages,
    pendingPackages,
    totalItemsWeight,
    totalPackagingWeight,
  };
};




// Create new dispatch and update order status
export const createDispatch = async (req, res) => {
  const { orderId } = req.params;
  try {
    const {
      dispatchType,
      warehouse,
      deliveryHub,
      carrier,
      rider,
      driver,
      vehicleNumber,
      dispatchDate,
      dispatchTime,
      destination,
      totalPackages,
      totalWeight,
      amount
    } = req.body;

    console.log('Creating dispatch for order:', orderId);
    console.log('Dispatch data:', req.body);

    // Validate required fields
    if (!dispatchType || !destination || !totalPackages || !totalWeight || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: dispatchType, destination, totalPackages, totalWeight, amount'
      });
    }

    // Check if order exists
    const existingOrder = await Order.findById(orderId);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Validate dispatch type specific requirements
    if (dispatchType === 'warehouse') {
      if (!warehouse) {
        return res.status(400).json({
          success: false,
          message: 'Warehouse is required for warehouse dispatch type'
        });
      }
      if (!driver) {
        return res.status(400).json({
          success: false,
          message: 'Driver is required for warehouse dispatch type'
        });
      }
    }

    if (dispatchType === 'delivery_hub') {
      if (!deliveryHub) {
        return res.status(400).json({
          success: false,
          message: 'Delivery hub is required for delivery hub dispatch type'
        });
      }
      if (!driver) {
        return res.status(400).json({
          success: false,
          message: 'Driver is required for delivery hub dispatch type'
        });
      }
    }

    if (dispatchType === 'carrier' && !carrier) {
      return res.status(400).json({
        success: false,
        message: 'Carrier is required for carrier dispatch type'
      });
    }

    if (dispatchType === 'rider' && !rider) {
      return res.status(400).json({
        success: false,
        message: 'Rider is required for rider dispatch type'
      });
    }

    // Validate ObjectId fields
    const validateObjectId = (id, fieldName) => {
      if (id && !mongoose.Types.ObjectId.isValid(id)) {
        throw new Error(`Invalid ${fieldName} ID: ${id}`);
      }
      return id;
    };

    // Create new dispatch object with proper ObjectId validation
  const newDispatch = {
  dispatchType,

  // warehouse or delivery hub both stored in warehouse field
  warehouse:
    dispatchType === "warehouse"
      ? validateObjectId(warehouse, "warehouse")
      : dispatchType === "delivery_hub"
      ? validateObjectId(deliveryHub, "deliveryHub")
      : undefined,

  // keep deliveryHub separately for clarity
  deliveryHub:
    dispatchType === "delivery_hub"
      ? validateObjectId(deliveryHub, "deliveryHub")
      : undefined,

  carrier:
    dispatchType === "carrier"
      ? validateObjectId(carrier, "carrier")
      : undefined,

  rider:
    dispatchType === "rider"
      ? validateObjectId(rider, "rider")
      : undefined,

  driver:
    dispatchType === "warehouse" || dispatchType === "delivery_hub"
      ? validateObjectId(driver, "driver")
      : undefined,

  vehicleNumber,
  dispatchDate: dispatchDate ? new Date(dispatchDate) : new Date(),
  dispatchTime,
  destination,
  totalPackages: Number(totalPackages),
  totalWeight: Number(totalWeight),
  amount: Number(amount),
  status: "dispatched",
  createdBy: req.user?._id || existingOrder.user,
};


    // Remove undefined fields to avoid validation issues
    Object.keys(newDispatch).forEach(key => {
      if (newDispatch[key] === undefined) {
        delete newDispatch[key];
      }
    });

    console.log('Processed dispatch data:', newDispatch);

    // Update order with new dispatch and change status to 'dispatched'
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        orderStatus: 'dispatched',
        $push: { dispatches: newDispatch }
      },
      { new: true, runValidators: true }
    ).populate('user', 'name email')
     .populate('allocatedWarehouse', 'name address')
     .populate('dispatches.warehouse', 'name address')
     .populate('dispatches.carrier', 'name contactInfo')
     .populate('dispatches.rider', 'name phone')
     .populate('dispatches.driver', 'name phone')
     .populate('dispatches.createdBy', 'name email');

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found after update'
      });
    }

    // Get the newly added dispatch (last one in the array)
    const savedDispatch = updatedOrder.dispatches[updatedOrder.dispatches.length - 1];

    res.status(201).json({
      success: true,
      message: 'Dispatch created successfully and order status updated to dispatched',
      data: {
        dispatch: savedDispatch,
        order: {
          _id: updatedOrder._id,
          orderId: updatedOrder.orderId,
          orderStatus: updatedOrder.orderStatus
        }
      }
    });

  } catch (error) {
    console.error('Error creating dispatch:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// // Get all dispatches with pagination and filters
// export const getAllDispatches = async (req, res) => {
//   try {
//     const { page = 1, limit = 10, status, dispatchType } = req.query;
//     const skip = (page - 1) * limit;

//     // Build filter object
//     const filter = {};
//     if (status) filter.status = status;
//     if (dispatchType) filter.dispatchType = dispatchType;

//     const dispatches = await Dispatch.find(filter)
//       .populate('order', 'orderId user shippingAddress')
//       .populate('warehouse', 'name')
//       .populate('deliveryHub', 'name')
//       .populate('carrier', 'name')
//       .populate('rider', 'name phone')
//       .populate('driver', 'name')
//       .populate('createdBy', 'name')
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(parseInt(limit));

//     const total = await Dispatch.countDocuments(filter);

//     res.status(200).json({
//       success: true,
//       data: {
//         dispatches,
//         pagination: {
//           currentPage: parseInt(page),
//           totalPages: Math.ceil(total / limit),
//           totalDispatches: total,
//           hasNext: page * limit < total,
//           hasPrev: page > 1
//         }
//       }
//     });

//   } catch (error) {
//     console.error('Error fetching dispatches:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Internal server error',
//       error: error.message
//     });
//   }
// };


export const getDispatchById = async (req, res) => {
  try {
    const { id } = req.params;

    const dispatch = await Dispatch.findById(id)
      .populate('order', 'orderId user items shippingAddress finalAmount')
      .populate('warehouse', 'name address phone')
      .populate('deliveryHub', 'name address phone')
      .populate('carrier', 'name contact email')
      .populate('rider', 'name phone vehicleType')
      .populate('driver', 'name licenseNumber phone')
      .populate('createdBy', 'name email role');

    if (!dispatch) {
      return res.status(404).json({
        success: false,
        message: 'Dispatch not found'
      });
    }

    res.status(200).json({
      success: true,
      data: dispatch
    });

  } catch (error) {
    console.error('Error fetching dispatch:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update dispatch status
export const updateDispatchStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = ['pending', 'in_transit', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const dispatch = await Dispatch.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate('order');

    if (!dispatch) {
      return res.status(404).json({
        success: false,
        message: 'Dispatch not found'
      });
    }

    // If dispatch is delivered, update order status to delivered
    if (status === 'delivered') {
      await Order.findByIdAndUpdate(
        dispatch.order._id,
        {
          orderStatus: 'delivered',
          isDelivered: true,
          deliveredAt: new Date()
        }
      );
    }

    // If dispatch is cancelled, update order status accordingly
    if (status === 'cancelled') {
      await Order.findByIdAndUpdate(
        dispatch.order._id,
        { orderStatus: 'cancelled' }
      );
    }

    res.status(200).json({
      success: true,
      message: `Dispatch status updated to ${status}`,
      data: dispatch
    });

  } catch (error) {
    console.error('Error updating dispatch status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get pending dispatch orders (orders ready for dispatch)
export const getPendingDispatchOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Find orders that are packed but not yet dispatched
    const pendingOrders = await Order.find({
      orderStatus: 'packed',
      // If you want to exclude orders that already have dispatches:
      // 'dispatches.0': { $exists: false }
    })
      .populate('user', 'name email phone')
      .populate('items.product', 'name sku')
      .populate('items.variant', 'size color')
      .populate('packings.items.product', 'name')
      .populate('allocatedWarehouse', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments({
      orderStatus: 'packed',
      // 'dispatches.0': { $exists: false }
    });

    res.status(200).json({
      success: true,
      data: {
        orders: pendingOrders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalOrders: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching pending dispatch orders:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};