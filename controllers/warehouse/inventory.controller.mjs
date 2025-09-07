import damagedInventory from "../../models/damagedInventory.mjs";
import Inventory from "../../models/inventory.mjs";
import inventoryLog from "../../models/inventoryLog.mjs";
import TransferRequest from "../../models/TransferRequest.mjs";
import { uploadBase64Images } from "../../utils/uploadImage.mjs";

export const createTransferRequest = async (req, res) => {
  try {
    const toWarehouse = req.user.assignedWarehouses._id;
    const {
      fromWarehouse,
      product,
      variant,
      carrier,
      dispatchTime,
      totalWeight,
      quantityRequested,
    } = req.body;

    if (!fromWarehouse || !quantityRequested || quantityRequested <= 0) {
      return res
        .status(400)
        .json({ message: "Required fields missing or invalid" });
    }

    if (!product && !variant) {
      return res
        .status(400)
        .json({ message: "Either product or variant must be specified" });
    }

    if (fromWarehouse.toString() === toWarehouse.toString()) {
      return res.status(400).json({
        message: "Source and destination warehouses cannot be the same",
      });
    }

    // Optionally verify source warehouse inventory here...

    const transferRequest = await TransferRequest.create({
      fromWarehouse,
      toWarehouse,
      product,
      variant,
      carrier,
      dispatchTime,
      totalWeight,
      quantityRequested,
    });

    res
      .status(201)
      .json({ message: "Transfer request created", transferRequest });
  } catch (err) {
    console.error("Create transfer request error:", err);
    res.status(500).json({ message: "Server error creating transfer request" });
  }
};

export const getTransferRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    const warehouseId = req.user.assignedWarehouses._id;
    if (warehouseId) {
      query.$or = [
        { fromWarehouse: warehouseId },
        { toWarehouse: warehouseId },
      ];
    }
    if (status) query.status = status;

    const transferRequests = await TransferRequest.find(query)
      .populate("fromWarehouse toWarehouse product variant driver")
      .sort({ requestedAt: -1 })
      .lean();

    res.status(200).json({
      data: transferRequests,
    });
  } catch (err) {
    console.error("Get transfer requests error:", err);
    res
      .status(500)
      .json({ message: "Server error fetching transfer requests" });
  }
};

export const updateTransferRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const transferRequest = await TransferRequest.findById(id);
    if (!transferRequest) return res.status(404).json({ message: "Not found" });

    // Update allowed statuses and fields
    if (updates.pickStatus) transferRequest.pickStatus = updates.pickStatus;
    if (updates.packStatus) transferRequest.packStatus = updates.packStatus;
    if (updates.driver) transferRequest.driver = updates.driver;
    if (updates.manifestStatus)
      transferRequest.manifestStatus = updates.manifestStatus;
    if (updates.shippedAt) transferRequest.shippedAt = updates.shippedAt;
    if (updates.receivedAt) transferRequest.receivedAt = updates.receivedAt;

    await transferRequest.save();

    // If delivery just completed, update inventories
    if (updates.manifestStatus === "delivered") {
      const qty = transferRequest.quantityRequested;

      // Deduct quantity from source warehouse inventory
      const fromInventoryQuery = transferRequest.variant
        ? {
            warehouse: transferRequest.fromWarehouse,
            variant: transferRequest.variant,
          }
        : {
            warehouse: transferRequest.fromWarehouse,
            product: transferRequest.product,
          };

      const fromInventory = await Inventory.findOne(fromInventoryQuery);
      if (!fromInventory || fromInventory.availableQuantity < qty) {
        return res.status(400).json({
          message:
            "Insufficient stock in source warehouse to finalize transfer",
        });
      }
      fromInventory.availableQuantity -= qty;
      await fromInventory.save();

      // Add quantity to destination warehouse inventory
      const toInventoryQuery = transferRequest.variant
        ? {
            warehouse: transferRequest.toWarehouse,
            variant: transferRequest.variant,
          }
        : {
            warehouse: transferRequest.toWarehouse,
            product: transferRequest.product,
          };

      let toInventory = await Inventory.findOne(toInventoryQuery);
      if (!toInventory) {
        toInventory = new Inventory({
          warehouse: transferRequest.toWarehouse,
          variant: transferRequest.variant || undefined,
          product: transferRequest.product || undefined,
          availableQuantity: 0,
        });
      }
      toInventory.availableQuantity += qty;
      await toInventory.save();

      // Optionally update transferRequest status to 'transferred' or completed
      transferRequest.status = "transferred";
      transferRequest.quantityTransferred = qty;
      transferRequest.transferredAt = new Date();
      await transferRequest.save();
    }

    res
      .status(200)
      .json({ message: "Transfer request updated", transferRequest });
  } catch (err) {
    console.error("Update transfer request error:", err);
    res.status(500).json({ message: "Server error updating transfer request" });
  }
};

export const assignDriverToTransferRequest = async (req, res) => {
  try {
    const transferRequestId = req.params.id;
    const { driverId } = req.body;

    if (!driverId) {
      return res.status(400).json({ message: "Driver ID is required" });
    }

    const transferRequest = await TransferRequest.findById(transferRequestId);
    if (!transferRequest) {
      return res.status(404).json({ message: "Transfer request not found" });
    }

    transferRequest.driver = driverId;

    // Optional: set shippedAt if starting transit now
    transferRequest.shippedAt = new Date();

    await transferRequest.save();

    res.status(200).json({
      message: "Driver assigned to transfer request successfully",
      transferRequest,
    });
  } catch (error) {
    console.error("Error assigning driver:", error);
    res.status(500).json({ message: "Server error assigning driver" });
  }
};

// Update inventory quantity (add or remove stock)
export const updateInventory = async (req, res) => {
  try {
    const {
      productId, // optional if variantId given
      variantId, // optional if productId given
      quantityChange, // positive to add, negative to remove
      reasonForUpdate,
      note,
      warehouseLocation,
      reOrderQuantity,
      maximumQuantity,
      minimumQuantity,
    } = req.body;
    const warehouseId = req.user.assignedWarehouses._id;

    if (!warehouseId) {
      return res.status(400).json({ message: "Warehouse is required" });
    }

    if (!productId && !variantId) {
      return res
        .status(400)
        .json({ message: "Product ID or Variant ID is required" });
    }

    if (typeof quantityChange !== "number" || quantityChange === 0) {
      return res
        .status(400)
        .json({ message: "Quantity change must be a non-zero number" });
    }

    if (!reasonForUpdate || reasonForUpdate.trim() === "") {
      return res.status(400).json({ message: "Reason for update is required" });
    }

    // Find existing inventory record or create new one
    const query = {
      warehouse: warehouseId,
      ...(productId ? { product: productId } : { variant: variantId }),
    };

    let inventory = await Inventory.findOne(query);

    if (!inventory) {
      // Create new inventory doc with initial quantity 0
      inventory = new Inventory({
        warehouse: warehouseId,
        product: productId || undefined,
        variant: variantId || undefined,
        availableQuantity: 0,
        minimumQuantity: 0,
        reorderQuantity: 0,
        maximumQuantity: 0,
        warehouseLocation: warehouseLocation || "",
      });
    }

    const previousQuantity = inventory.availableQuantity;
    const newQuantity = previousQuantity + quantityChange;

    if (newQuantity < 0) {
      return res
        .status(400)
        .json({ message: "Resulting quantity cannot be negative" });
    }
    if (
      inventory.maximumQuantity > 0 &&
      newQuantity > inventory.maximumQuantity
    ) {
      return res.status(400).json({
        message: `Resulting quantity exceeds maximum limit of ${inventory.maximumQuantity}`,
      });
    }

    // Update all fields you want to modify
    if (warehouseLocation !== undefined)
      inventory.warehouseLocation = warehouseLocation;
    if (minimumQuantity !== undefined)
      inventory.minimumQuantity = minimumQuantity;
    if (reOrderQuantity !== undefined)
      inventory.reorderQuantity = reOrderQuantity;
    if (maximumQuantity !== undefined)
      inventory.maximumQuantity = maximumQuantity;

    inventory.availableQuantity = newQuantity;
    inventory.updatedAt = new Date();

    await inventory.save();

    // Log the update
    await inventoryLog.create({
      inventory: inventory._id,
      product: productId || undefined,
      variant: variantId || undefined,
      warehouse: warehouseId,
      previousQuantity,
      quantityChange,
      newQuantity,
      reasonForUpdate,
      note,
      warehouseLocation: warehouseLocation || "",
      updatedBy: req.user ? req.user._id : null,
    });

    res.status(200).json({
      message: "Inventory updated successfully",
      inventory,
    });
  } catch (err) {
    console.error("Error updating inventory:", err);
    res.status(500).json({ message: "Server error updating inventory" });
  }
};

export const getAllInventories = async (req, res) => {
  try {
    const { productId, variantId, page = 1, limit = 50 } = req.query;
    const warehouseId = req.user.assignedWarehouses._id;

    const query = {};
    if (warehouseId) query.warehouse = warehouseId;
    if (productId) query.product = productId;
    if (variantId) query.variant = variantId;

    const inventories = await Inventory.find(query)
      .populate("warehouse")
      .populate("warehouseLocation")
      .populate({
        path: "variant",
        populate: {
          path: "productId", // populate product inside variant
          select: "productName SKU urlSlug", // select product fields you want
        },
      })
      .populate("product") // also populate product directly (for inventories related to product without variant)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ updatedAt: -1 })
      .lean();

    const total = await Inventory.countDocuments(query);

    res.status(200).json({
      data: inventories,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching inventories:", error);
    res.status(500).json({ message: "Server error fetching inventories" });
  }
};

export const getInventoryById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Inventory ID is required" });
    }

    const inventory = await Inventory.findById(id)
      .populate("warehouse")
      .populate("warehouseLocation")
      .populate({
        path: "variant",
        populate: {
          path: "productId",
          select: "productName SKU urlSlug",
        },
      })
      .populate("product")
      .lean();

    if (!inventory) {
      return res.status(404).json({ message: "Inventory not found" });
    }

    res.status(200).json(inventory);
  } catch (error) {
    console.error("Error fetching inventory by ID:", error);
    res.status(500).json({ message: "Server error fetching inventory" });
  }
};

export const getInventoryLogs = async (req, res) => {
  try {
    const { productId, variantId } = req.query;
    const warehouseId = req.user.assignedWarehouses._id;
    const query = {};
    if (warehouseId) query.warehouse = warehouseId;
    if (productId) query.product = productId;
    if (variantId) query.variant = variantId;

    const logs = await inventoryLog
      .find(query)
      .populate("product", "productName SKU")
      .populate("variant", "SKU")
      .populate("warehouseLocation", "code name")
      .populate("updatedBy", "fullName")
      .sort({ createdAt: -1 })
      .lean();
    console.log(logs);
    // Generate descriptive message for each log
    const logsWithMessages = logs.map((log) => {
      const qtyChange = log.quantityChange || 0;
      const qtyAbs = Math.abs(qtyChange);
      const action = qtyChange > 0 ? "added to" : "removed from";

      let itemName = "Unknown item";
      if (log.product) {
        itemName = `${log.product.productName} (SKU ${log.product.SKU})`;
      } else if (log.variant) {
        itemName = `Variant SKU ${log.variant.SKU}`;
      }

      const locationName = log.warehouseLocation
        ? log.warehouseLocation.code ||
          log.warehouseLocation.name ||
          "Unknown Location"
        : "Unknown Location";

      const userName = log.updatedBy ? log.updatedBy.fullName : "Unknown User";

      const message = `${
        qtyChange > 0 ? "+" : "-"
      }${qtyAbs} of ${itemName} was ${action} Location ${locationName}, by ${userName}`;

      return {
        message,
      };
    });

    res.status(200).json({
      data: logsWithMessages,
    });
  } catch (error) {
    console.error("Error fetching inventory logs:", error);
    res.status(500).json({ message: "Server error fetching inventory logs" });
  }
};

export const toggleFavoriteInventoryLog = async (req, res) => {
  try {
    const { id } = req.params; // inventory log ID
    if (!id) {
      return res.status(400).json({ message: "Inventory log ID is required" });
    }

    const inventoryLog = await inventoryLog.findById(id);
    if (!inventoryLog) {
      return res.status(404).json({ message: "Inventory log not found" });
    }

    // Toggle favorite status
    inventoryLog.isFavourite = !inventoryLog.isFavourite;
    await inventoryLog.save();

    res.status(200).json({
      message: `Inventory log ${
        inventoryLog.isFavourite ? "favorited" : "unfavorited"
      } successfully`,
      isFavourite: inventoryLog.isFavourite,
      inventoryLog,
    });
  } catch (error) {
    console.error("Error toggling favorite inventory log:", error);
    res
      .status(500)
      .json({ message: "Server error toggling favorite inventory log" });
  }
};

export const createDamagedInventoryReport = async (req, res) => {
  try {
    const {
      product, // product ID (optional but preferred)
      variant, // variant ID (optional)
      currentQuantity,
      quantityToReport,
      damageType,
      note,
      evidenceImages,
    } = req.body;

    const warehouse = req.user.assignedWarehouses._id;

    // Validate required fields
    if (!warehouse) {
      return res.status(400).json({ message: "Warehouse ID is required" });
    }
    if (!product && !variant) {
      return res
        .status(400)
        .json({ message: "Either product or variant must be specified" });
    }
    if (typeof currentQuantity !== "number" || currentQuantity < 0) {
      return res
        .status(400)
        .json({ message: "Current quantity must be a non-negative number" });
    }
    if (typeof quantityToReport !== "number" || quantityToReport <= 0) {
      return res
        .status(400)
        .json({ message: "Quantity to report must be a positive number" });
    }
    if (!damageType) {
      return res.status(400).json({ message: "Damage type is required" });
    }

    // Upload images (optional)
    const uploadedImageUrls =
      evidenceImages && evidenceImages.length > 0
        ? await uploadBase64Images(evidenceImages, "damaged-inventory/")
        : [];

    // Create damaged report *without linking inventory*
    const damagedReport = await damagedInventory.create({
      warehouse,
      product: product || undefined,
      variant: variant || undefined,
      currentQuantity,
      quantityToReport,
      damageType,
      note,
      evidenceImages: uploadedImageUrls,
      uploadedBy: req.user._id,
    });

    res.status(201).json({
      message: "Damaged inventory report created successfully",
      damagedReport,
    });
  } catch (error) {
    console.error("Create Damaged Inventory Report Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getDamagedInventoryReports = async (req, res) => {
  try {
    const { productId, variantId } = req.query;
    const warehouseId = req.user.assignedWarehouses._id;
    const query = {};
    if (warehouseId) query.warehouse = warehouseId;
    if (productId) query.product = productId;
    if (variantId) query.variant = variantId;

    const reports = await damagedInventory
      .find(query)
      .populate("warehouse product variant uploadedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      data: reports,
    });
  } catch (error) {
    console.error("Error fetching damaged inventory reports:", error);
    res
      .status(500)
      .json({ message: "Server error fetching damaged inventory reports" });
  }
};
