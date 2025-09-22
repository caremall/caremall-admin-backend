import mongoose from "mongoose";
import Supplier from "../../models/Supplier.mjs";
import { uploadBase64Image } from "../../utils/uploadImage.mjs";

export const createSupplier = async (req, res) => {
  try {
    const {
      supplierName,
      contactName,
      contactNumber,
      email,
      taxRegNo,
      address,
      pincode,
      image,
    } = req.body;

    const assignedWarehouse = req.user?.assignedWarehouses;
    if (!assignedWarehouse?._id) {
      return res
        .status(400)
        .json({ message: "User is not assigned to any warehouse" });
    }
    const warehouseId = assignedWarehouse._id;

    // Check existing supplier by name scoped only to assigned warehouse
    const existingSupplier = await Supplier.findOne({
      supplierName: supplierName.trim(),
      warehouse: warehouseId,
    });
    if (existingSupplier) {
      return res.status(200).json({
        message: "Supplier already exists in this warehouse",
      });
    }

    let imageURL = "";
    if (image) {
      const uploaded = await uploadBase64Image(image, "supplier-images/");
      imageURL = uploaded;
    }

    const supplierData = {
      supplierName,
      contactName,
      contactNumber,
      email,
      taxRegNo,
      address,
      pincode,
      image: imageURL,
      warehouse: warehouseId,
    };

    const newSupplier = await Supplier.create(supplierData);

    res
      .status(201)
      .json({ success: true, message: "Supplier created", data: newSupplier });
  } catch (error) {
    console.error("Create Supplier error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get all suppliers for the user's assigned warehouse
export const getSuppliers = async (req, res) => {
  try {
    const assignedWarehouse = req.user?.assignedWarehouses;
    if (!assignedWarehouse?._id) {
      return res
        .status(400)
        .json({ message: "User is not assigned to any warehouse" });
    }
    const warehouseId = assignedWarehouse._id;

    const suppliers = await Supplier.find({ warehouse: warehouseId })
      .populate("warehouse", "name type")
      .sort({ createdAt: -1 });

    res.status(200).json({ data: suppliers, total: suppliers.length });
  } catch (err) {
    console.error("Get Suppliers error:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch suppliers", error: err.message });
  }
};

// Get a single supplier by ID within user's assigned warehouse
export const getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;
    const assignedWarehouse = req.user?.assignedWarehouses;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid supplier ID" });
    }
    if (!assignedWarehouse?._id) {
      return res
        .status(400)
        .json({ message: "User is not assigned to any warehouse" });
    }
    const warehouseId = assignedWarehouse._id;

    const supplier = await Supplier.findOne({
      _id: id,
      warehouse: warehouseId,
    }).populate("warehouse", "name type");

    if (!supplier)
      return res
        .status(404)
        .json({ message: "Supplier not found in your warehouse" });

    res.status(200).json({ supplier });
  } catch (err) {
    console.error("Get Supplier by ID error:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch supplier", error: err.message });
  }
};

// Update a supplier by ID if it belongs to user's assigned warehouse
export const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const assignedWarehouse = req.user?.assignedWarehouses;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid supplier ID" });
    }
    if (!assignedWarehouse?._id) {
      return res
        .status(400)
        .json({ message: "User is not assigned to any warehouse" });
    }
    const warehouseId = assignedWarehouse._id;
    if (updateData.image && updateData.image.startsWith("data:image/")) {
      const uploadedImageUrl = await uploadBase64Image(
        updateData.image,
        "supplier-images/"
      );
      updateData.image = uploadedImageUrl;
    }
    // Ensure supplier belongs to assigned warehouse before update
    const supplier = await Supplier.findOneAndUpdate(
      { _id: id, warehouse: warehouseId },
      updateData,
      { new: true }
    ).populate("warehouse", "name type");

    if (!supplier)
      return res
        .status(404)
        .json({ message: "Supplier not found in your warehouse" });

    res.status(200).json({ message: "Supplier updated", supplier });
  } catch (err) {
    console.error("Update Supplier error:", err);
    res
      .status(500)
      .json({ message: "Failed to update supplier", error: err.message });
  }
};

// Delete a supplier by ID only if it belongs to user's assigned warehouse
export const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const assignedWarehouse = req.user?.assignedWarehouses;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid supplier ID" });
    }
    if (!assignedWarehouse?._id) {
      return res
        .status(400)
        .json({ message: "User is not assigned to any warehouse" });
    }
    const warehouseId = assignedWarehouse._id;

    const supplier = await Supplier.findOneAndDelete({
      _id: id,
      warehouse: warehouseId,
    });
    if (!supplier)
      return res
        .status(404)
        .json({ message: "Supplier not found in your warehouse" });

    res.status(200).json({ message: "Supplier deleted" });
  } catch (err) {
    console.error("Delete Supplier error:", err);
    res
      .status(500)
      .json({ message: "Failed to delete supplier", error: err.message });
  }
};

// Delete multiple suppliers owned by user's assigned warehouse
export const deleteSuppliers = async (req, res) => {
  try {
    const { ids } = req.body; // Expect ids as an array of supplier IDs
    const assignedWarehouse = req.user?.assignedWarehouses;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "ids must be a non-empty array" });
    }
    if (!assignedWarehouse?._id) {
      return res
        .status(400)
        .json({ message: "User is not assigned to any warehouse" });
    }
    const warehouseId = assignedWarehouse._id;

    // Validate all IDs
    const invalidIds = ids.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res
        .status(400)
        .json({ message: "One or more invalid supplier IDs", invalidIds });
    }

    // Delete only suppliers belonging to user's warehouse
    const deleteResult = await Supplier.deleteMany({
      _id: { $in: ids },
      warehouse: warehouseId,
    });

    res.status(200).json({
      message: `${deleteResult.deletedCount} suppliers deleted successfully`,
    });
  } catch (err) {
    console.error("Delete multiple suppliers error:", err);
    res
      .status(500)
      .json({ message: "Failed to delete suppliers", error: err.message });
  }
};
