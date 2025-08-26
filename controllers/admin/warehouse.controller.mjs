import mongoose from "mongoose";
import Warehouse from "../../models/Warehouse.mjs";

// Create a new warehouse
export const createWarehouse = async (req, res) => {
  try {
    const warehouseData = req.body;
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



// Get a single warehouse by ID
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
    if (!warehouse)
      return res.status(404).json({ message: "Warehouse not found" });
    res.status(200).json({ warehouse });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to fetch warehouse", error: err.message });
  }
};


// Update a warehouse by ID
export const updateWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid warehouse ID" });
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

    if (!warehouse)
      return res.status(404).json({ message: "Warehouse not found" });
    res.status(200).json({ message: "Warehouse updated", warehouse });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to update warehouse", error: err.message });
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

