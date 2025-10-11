import mongoose from "mongoose";
import Warehouse from "../../models/Warehouse.mjs";
import Orders from "../../models/Order.mjs"
import Order from "../../models/Order.mjs";
import damagedInventory from "../../models/damagedInventory.mjs";

// Create a new warehouse
export const createWarehouse = async (req, res) => {
  try {
    const warehouseData = req.body;
    
    // Check if warehouse with same name already exists
    const existingWarehouse = await Warehouse.findOne({ 
      name: warehouseData.name 
    });
    
    if (existingWarehouse) {
      return res.status(400).json({ 
        message: "Warehouse name already exists. Please use a different name." 
      });
    }
    
    const warehouse = new Warehouse(warehouseData);
    await warehouse.save();
    res.status(201).json({ message: "Warehouse created", warehouse });
  } catch (err) {
    console.error("Create Warehouse error:", err);
    res
      .status(500)
      .json({ message: "Failed to create warehouse", error: err.message });
  }
};

// Get all warehouses with optional filtering, pagination, sorting
export const getWarehouses = async (req, res) => {
  try {
    const query = {};
    if (req.query.status && req.query.status !== "all") {
      query.status = req.query.status;
    }
    if (req.query.type && req.query.type !== "all") {
      query.type = req.query.type;
    }

    const warehouses = await Warehouse.find(query)
      .populate("manager")
      .sort({ createdAt: -1 }); // Modify sort as needed

    res.status(200).json({ data: warehouses, total: warehouses.length });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to fetch warehouses", error: err.message });
  }
};




export const getWarehouseById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid warehouse ID" });
    }

    const warehouse = await Warehouse.findById(id)
      .populate("manager")
      .populate({
        path: "supportedSKUs",
        populate: { path: "productId", select: "productName SKU" },
      });

    if (!warehouse) {
      return res.status(404).json({ message: "Warehouse not found" });
    }

    // Calculate all metrics
    const [
      totalOrders,
      totalDeliveredOrders, 
      totalReturnOrders,
      damagedItemsResult,
      processingOrders,
      pickedOrders,
      packedOrders,
      dispatchedOrders
    ] = await Promise.all([
      // Total orders allocated to this warehouse
      Order.countDocuments({
        allocatedWarehouse: id
      }),

      // Total delivered orders
      Order.countDocuments({
        allocatedWarehouse: id,
        orderStatus: "delivered"
      }),

      // Total return/cancelled orders
      Order.countDocuments({
        allocatedWarehouse: id,
        orderStatus: "cancelled"
      }),

      // Total damaged items quantity
      damagedInventory.aggregate([
        {
          $match: { warehouse: new mongoose.Types.ObjectId(id) }
        },
        {
          $group: {
            _id: null,
            totalDamagedItems: { $sum: "$quantityToReport" }
          }
        }
      ]),

      // Processing orders
      Order.countDocuments({
        allocatedWarehouse: id,
        orderStatus: "processing"
      }),

      // Picked orders
      Order.countDocuments({
        allocatedWarehouse: id,
        orderStatus: "picked"
      }),

      // Packed orders
      Order.countDocuments({
        allocatedWarehouse: id,
        orderStatus: "packed"
      }),

      // Dispatched orders
      Order.countDocuments({
        allocatedWarehouse: id,
        orderStatus: "dispatched"
      })
    ]);

    // Extract damaged items count
    const totalDamagedItems = damagedItemsResult.length > 0 ? damagedItemsResult[0].totalDamagedItems : 0;

    // Calculate success rate (delivered orders / total orders)
    const successRate = totalOrders > 0 ? (totalDeliveredOrders / totalOrders) * 100 : 0;

    // Prepare response with all metrics
    const response = {
      warehouse,
      metrics: {
        totalOrders,
        totalDeliveredOrders,
        totalReturnOrders,
        totalDamagedItems,
        processingOrders,
        pickedOrders,
        packedOrders,
        dispatchedOrders,
        successRate: Math.round(successRate * 100) / 100 // Round to 2 decimal places
      }
    };

    res.status(200).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      message: "Failed to fetch warehouse", 
      error: err.message 
    });
  }
};





// export const getWarehouseById = async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json({ message: "Invalid warehouse ID" });
//     }

//     console.log('Warehouse ID from params:', id);
//     console.log('Warehouse ID type:', typeof id);

//     // Check if the ID is a valid ObjectId
//     const objectId = new mongoose.Types.ObjectId(id);
//     console.log('Converted to ObjectId:', objectId);

//     // Test the delivered orders query only
//     const query = {
//       allocatedWarehouse: id,
//       orderStatus: "delivered",
//       isDelivered: true
//     };
    
//     console.log('Query object:', JSON.stringify(query, null, 2));

//     const totalDeliveredOrders = await Order.countDocuments(query);
//     console.log('Total Delivered Orders:', totalDeliveredOrders);

//     // For debugging, let's also check if any orders exist with this warehouse at all
//     const anyOrders = await Order.findOne({ allocatedWarehouse: id });
//     console.log('Sample order with this warehouse:', anyOrders);

//     // Return just this for testing
//     res.status(200).json({
//       warehouseId: id,
//       totalDeliveredOrders,
//       queryUsed: query
//     });

//   } catch (err) {
//     console.error('Error in getWarehouseById:', err);
//     res.status(500).json({ 
//       message: "Failed to fetch warehouse", 
//       error: err.message 
//     });
//   }
// };
// Update a warehouse by ID
// ✅ Update an existing warehouse
export const updateWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid warehouse ID" });
    }

    // 🟢 Fetch the current warehouse first
    const currentWarehouse = await Warehouse.findById(id);
    if (!currentWarehouse) {
      return res.status(404).json({ message: "Warehouse not found" });
    }

    // 🔑 Only check for duplicate name if the name is being changed
    if (updateData.name && updateData.name !== currentWarehouse.name) {
      const existingWarehouse = await Warehouse.findOne({
        name: updateData.name,
        _id: { $ne: id }, // exclude current warehouse
      });

      if (existingWarehouse) {
        return res.status(400).json({
          message: "Warehouse name already exists. Please use a different name.",
        });
      }
    }

    // Validate supportedSKUs array if present
    if (updateData.supportedSKUs && !Array.isArray(updateData.supportedSKUs)) {
      return res
        .status(400)
        .json({ message: "supportedSKUs must be an array" });
    }

    const warehouse = await Warehouse.findByIdAndUpdate(id, updateData, {
      new: true,
    })
      .populate("manager", "fullName email")
      .populate({
        path: "supportedSKUs",
        populate: { path: "productId", select: "productName SKU" },
      });

    res.status(200).json({ message: "Warehouse updated", warehouse });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Failed to update warehouse",
      error: err.message,
    });
  }
};



// Delete a warehouse by ID
export const deleteWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid warehouse ID" });
    }

    const warehouse = await Warehouse.findByIdAndDelete(id);
    if (!warehouse)
      return res.status(404).json({ message: "Warehouse not found" });

    res.status(200).json({ message: "Warehouse deleted" });
  } catch (err) {
    console.error("Delete Warehouse error:", err);
    res
      .status(500)
      .json({ message: "Failed to delete warehouse", error: err.message });
  }
};

// Delete multiple warehouses by IDs
export const deleteWarehouses = async (req, res) => {
  try {
    const { ids } = req.body; // Expect ids as an array of warehouse IDs
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "ids must be a non-empty array" });
    }

    // Validate all IDs
    const invalidIds = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ message: "One or more invalid warehouse IDs", invalidIds });
    }

    // Delete all warehouses with IDs in the array
    const deleteResult = await Warehouse.deleteMany({ _id: { $in: ids } });

    res.status(200).json({ 
      message: `${deleteResult.deletedCount} warehouses deleted successfully` 
    });
  } catch (err) {
    console.error("Delete multiple warehouses error:", err);
    res.status(500).json({ message: "Failed to delete warehouses", error: err.message });
  }
};



export const getOrdersByWarehouseId = async (req, res) => {
  try {
    const { warehouseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(warehouseId)) {
      return res.status(400).json({ message: "Invalid warehouse ID" });
    }

    const orders = await Orders.find({ allocatedWarehouse: warehouseId })
      .populate("user", "fullName email") 
      .populate({
        path: "items.product",
        select: "productName SKU price",
      })
      .populate("allocatedBy", "fullName email")
      .sort({ createdAt: -1 });

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "No orders found for this warehouse" });
    }

    res.status(200).json({ warehouseId, totalOrders: orders.length, orders });
  } catch (err) {
    console.error("Get Orders by Warehouse error:", err);
    res.status(500).json({ message: "Failed to fetch orders", error: err.message });
  }
};