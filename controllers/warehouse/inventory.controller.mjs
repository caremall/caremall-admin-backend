import damagedInventory from "../../models/damagedInventory.mjs";
import Inbound from "../../models/Inbound.mjs";
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

// Increment inventory quantity by 1
export const incrementInventory = async (req, res) => {
  try {
    const inventoryId = req.params.id;

    if (!inventoryId) {
      return res.status(400).json({ message: "Inventory ID is required" });
    }

    const inventory = await Inventory.findById(inventoryId);
    if (!inventory) {
      return res.status(404).json({ message: "Inventory not found" });
    }

    inventory.availableQuantity += 1;
    inventory.updatedAt = new Date();
    await inventory.save();

    res.status(200).json({
      message: "Inventory incremented successfully",
      availableQuantity: inventory.availableQuantity,
    });
  } catch (error) {
    console.error("Error incrementing inventory:", error);
    res.status(500).json({ message: "Server error incrementing inventory" });
  }
};

// Decrement inventory quantity by 1
export const decrementInventory = async (req, res) => {
  try {
    const inventoryId = req.params.id;

    if (!inventoryId) {
      return res.status(400).json({ message: "Inventory ID is required" });
    }

    const inventory = await Inventory.findById(inventoryId);
    if (!inventory) {
      return res.status(404).json({ message: "Inventory not found" });
    }

    if (inventory.availableQuantity <= 0) {
      return res
        .status(400)
        .json({ message: "Inventory cannot go below zero" });
    }

    inventory.availableQuantity -= 1;
    inventory.updatedAt = new Date();
    await inventory.save();

    res.status(200).json({
      message: "Inventory decremented successfully",
      availableQuantity: inventory.availableQuantity,
    });
  } catch (error) {
    console.error("Error decrementing inventory:", error);
    res.status(500).json({ message: "Server error decrementing inventory" });
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

    // Generate message and include time (createdAt) and favorite flag
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
        createdAt: log.createdAt, // Time of log
        isFavorite: log.isFavorite, // Whether log is marked favorite
        _id: log._id, // Useful for frontend toggling favorite, etc
      };
    });

    // Filter for favorites
    const favoriteLogs = logsWithMessages.filter((log) => log.isFavorite);

    res.status(200).json({
      data: logsWithMessages,
      logs: logs,
      favorites: favoriteLogs, // only favorite logs
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

export const updateDamagedInventoryReport = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Inventory ID is required" });
    }

    const {
      currentQuantity,
      quantityToReport,
      damageType,
      note,
      evidenceImages,
    } = req.body;

    const warehouseId = req.user.assignedWarehouses?._id;

    if (!warehouseId) {
      return res.status(400).json({ message: "Warehouse ID is required" });
    }

    // Find the report by ID and warehouse
    const report = await damagedInventory.findOne({
      _id: id,
      warehouse: warehouseId,
    });
    if (!report) {
      return res
        .status(404)
        .json({ message: "Report not found or unauthorized" });
    }

    // Validate and update fields if provided
    if (currentQuantity !== undefined) {
      if (typeof currentQuantity !== "number" || currentQuantity < 0) {
        return res
          .status(400)
          .json({ message: "Current quantity must be a non-negative number" });
      }
      report.currentQuantity = currentQuantity;
    }

    if (quantityToReport !== undefined) {
      if (typeof quantityToReport !== "number" || quantityToReport <= 0) {
        return res
          .status(400)
          .json({ message: "Quantity to report must be a positive number" });
      }
      report.quantityToReport = quantityToReport;
    }

    if (damageType !== undefined) {
      if (typeof damageType !== "string" || damageType.trim() === "") {
        return res
          .status(400)
          .json({ message: "Damage type must be a valid string" });
      }
      report.damageType = damageType;
    }

    if (note !== undefined) {
      report.note = note;
    }

    if (
      evidenceImages &&
      Array.isArray(evidenceImages) &&
      evidenceImages.length > 0
    ) {
      try {
        const uploadedImageUrls = await Promise.all(
          evidenceImages.map(async (image) => {
            if (typeof image === "string" && image.startsWith("data:image/")) {
              // It's a base64 image, upload it
              return await uploadBase64Images([image], "damaged-inventory/");
            } else if (
              typeof image === "string" &&
              (image.startsWith("http://") || image.startsWith("https://"))
            ) {
              // It's a URL, use it as-is
              return image;
            } else {
              // Invalid format, skip or handle as needed
              console.warn("Invalid image format skipped:", image);
              return null;
            }
          })
        );

        // Filter out any null or undefined results
        report.evidenceImages = uploadedImageUrls.filter((url) => url !== null);
      } catch (uploadError) {
        console.error("Image upload failed:", uploadError);
        return res.status(500).json({ message: "Failed to process images" });
      }
    }

    // Save the updated report
    await report.save();

    res.status(200).json({
      message: "Damaged inventory report updated successfully",
      damagedReport: report,
    });
  } catch (error) {
    console.error("Update Damaged Inventory Report Error:", error);
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
      .populate("warehouse product variant uploadedBy")
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

export const getDamagedInventoryReportsById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Inventory ID is required" });
    }
    const { productId, variantId } = req.query;
    const warehouseId = req.user.assignedWarehouses._id;
    const query = {};
    if (warehouseId) query.warehouse = warehouseId;
    if (productId) query.product = productId;
    if (variantId) query.variant = variantId;

    const reports = await damagedInventory
      .findById(id)
      .find(query)
      .populate("warehouse product variant uploadedBy")
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

export const deleteDamagedInventoryReport = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Inventory ID is required" });
    }

    const warehouseId = req.user.assignedWarehouses?._id;

    const query = { _id: id };
    if (warehouseId) query.warehouse = warehouseId;

    // Find and delete the document
    const report = await damagedInventory.findOneAndDelete(query);

    if (!report) {
      return res
        .status(404)
        .json({ message: "Report not found or unauthorized" });
    }

    res
      .status(200)
      .json({ message: "Report deleted successfully", data: report });
  } catch (error) {
    console.error("Error deleting damaged inventory report:", error);
    res
      .status(500)
      .json({ message: "Server error deleting damaged inventory report" });
  }
};

export const getLowStockProducts = async (req, res) => {
  try {
    const warehouseId = req.user.assignedWarehouses?._id;
    const query = {
      $expr: { $lt: ["$availableQuantity", "$minimumQuantity"] },
    };
    if (warehouseId) query.warehouse = warehouseId; // Optional: filter by user's warehouse
    const lowStockInventories = await Inventory.find(query)
      .populate("warehouse")
      .populate({
        path: "variant",
        populate: {
          path: "productId",
          select: "productName",
        },
      })
      .lean();

    // Generate user-friendly alert strings
    const alerts = lowStockInventories.map((item) => {
      let productName = "Unknown";
      let sku = "NO-SKU";

      if (item.variant && typeof item.variant === "object") {
        sku = item.variant.SKU || sku;
        if (item.variant.productId && item.variant.productId.productName) {
          productName = item.variant.productId.productName;
        }
      }

      if (item.product && typeof item.product === "object") {
        productName = item.product.productName || productName;
        if (item.product.SKU) sku = item.product.SKU;
      }

      if (item.availableQuantity === 0) {
        return `OUT OF STOCK ALERT: ${productName} (${sku}) has ran out of stock`;
      }

      return `LOW STOCK ALERT: ${productName} (${sku}) below minimum threshold ${item.minimumQuantity} - ${item.availableQuantity} units left.`;
    });

    res.status(200).json({
      data: alerts,
    });
  } catch (err) {
    console.error("Error fetching low stock inventories:", err);
    res
      .status(500)
      .json({ message: "Server error fetching low stock inventories" });
  }
};

export const createInboundJob = async (req, res) => {
  try {
    const {
      jobType,
      jobNumber,
      status,
      date,
      supplier,
      allocatedLocation,
      items,
    } = req.body;

    const warehouse = req.user.assignedWarehouses._id;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Inbound items are required" });
    }

    // Create inbound job document
    const inboundJob = await Inbound.create({
      jobType,
      jobNumber,
      status,
      date,
      supplier,
      allocatedLocation,
      items,
      warehouse,
    });

    // Update inventory quantities for each item
    for (const item of items) {
      const productId = item.productId || null;
      const variantId = item.variantId || null;
      const receivedQty = item.receivedQuantity || 0;

      if (!warehouse || (!productId && !variantId)) continue;

      const query = {
        warehouse,
        ...(productId ? { product: productId } : { variant: variantId }),
      };

      let inventory = await Inventory.findOne(query);
      if (!inventory) {
        inventory = new Inventory({
          warehouse,
          product: productId || undefined,
          variant: variantId || undefined,
          availableQuantity: 0,
          minimumQuantity: 0,
          reorderQuantity: 0,
          maximumQuantity: 0,
        });
      }

      inventory.availableQuantity += receivedQty;
      inventory.updatedAt = new Date();

      await inventory.save();
    }

    return res.status(201).json({
      message: "Inbound job created and inventory updated successfully",
      inboundJob,
    });
  } catch (error) {
    console.error("Error creating inbound job:", error);
    return res
      .status(500)
      .json({ message: "Server error creating inbound job" });
  }
};

export const getInboundJobs = async (req, res) => {
  try {
    const { status } = req.query;
    const warehouseId = req.user.assignedWarehouses._id;

    const query = { warehouse: warehouseId };
    if (status) query.status = status;

    const inboundJobs = await Inbound.find(query)
      .populate("supplier")
      .populate("warehouse")
      .populate("allocatedLocation")
      .populate("items.productId")
      .populate("items.variantId")
      .lean();

    return res.status(200).json({
      data: inboundJobs,
    });
  } catch (error) {
    console.error("Error fetching inbound jobs:", error);
    return res
      .status(500)
      .json({ message: "Server error fetching inbound jobs" });
  }
};

export const getInboundJobById = async (req, res) => {
  try {
    const { id } = req.params; // inbound job id from route param
    const warehouseId = req.user.assignedWarehouses._id;

    if (!id) {
      return res.status(400).json({ message: "Inbound job ID is required" });
    }

    const inboundJob = await Inbound.findOne({
      _id: id,
      warehouse: warehouseId, // make sure user only accesses their warehouse
    })
      .populate("supplier")
      .populate("warehouse")
      .populate("allocatedLocation")
      .populate("items.productId")
      .populate("items.variantId")
      .lean();

    if (!inboundJob) {
      return res.status(404).json({ message: "Inbound job not found" });
    }

    return res.status(200).json({
      data: inboundJob,
    });
  } catch (error) {
    console.error("Error fetching inbound job by ID:", error);
    return res
      .status(500)
      .json({ message: "Server error fetching inbound job by ID" });
  }
};
