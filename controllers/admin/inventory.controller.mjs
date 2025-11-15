import damagedInventory from "../../models/damagedInventory.mjs";
import Inventory from "../../models/inventory.mjs";
import inventoryLog from "../../models/inventoryLog.mjs";
import { uploadBase64Images } from "../../utils/uploadImage.mjs";
// Update inventory quantity (add or remove stock)
export const updateInventory = async (req, res) => {
  try {
    const {
      productId, // optional if variantId given
      variantId, // optional if productId given
      warehouseId,
      quantityChange, // positive to add, negative to remove
      reasonForUpdate,
      note,
      warehouseLocation,
      reOrderQuantity,
      maximumQuantity,
      minimumQuantity,
    } = req.body;

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
    const {
      warehouseId,
      productId,
      variantId,
      page = 1,
      limit = 50,
    } = req.query;

    const query = {};
    if (warehouseId) query.warehouse = warehouseId;
    if (productId) query.product = productId;
    if (variantId) query.variant = variantId;

    const inventories = await Inventory.find(query)
      .populate("warehouse")
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
    const {
      warehouseId,
      productId,
      variantId,
      page = 1,
      limit = 50,
    } = req.query;

    const query = {};
    if (warehouseId) query.warehouse = warehouseId;
    if (productId) query.product = productId;
    if (variantId) query.variant = variantId;

    const logs = await inventoryLog
      .find(query)
      .populate("inventory warehouse product variant updatedBy", "name email")
      .populate({
        path: "variant",
        populate: {
          path: "productId",
          select: "productName SKU urlSlug",
        },
      })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .lean();

    const total = await inventoryLog.countDocuments(query);

    res.status(200).json({
      data: logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
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
    const inventoryId = req.params.id; // from route params

    const {
      currentQuantity,
      quantityToReport,
      damageType,
      note,
      evidenceImages,
    } = req.body;

    if (!inventoryId) {
      return res.status(400).json({ message: "Inventory ID is required" });
    }
    if (typeof currentQuantity !== "number" || currentQuantity < 0)
      return res
        .status(400)
        .json({ message: "Current quantity must be non-negative number" });
    if (typeof quantityToReport !== "number" || quantityToReport <= 0)
      return res
        .status(400)
        .json({ message: "Quantity to report must be positive number" });
    if (!damageType)
      return res.status(400).json({ message: "Damage type is required" });

    // Find inventory document
    const inventoryDoc = await Inventory.findById(inventoryId);
    if (!inventoryDoc) {
      return res.status(404).json({ message: "Inventory record not found" });
    }

    // Upload images
    const uploadedImageUrls = await uploadBase64Images(
      evidenceImages,
      "damaged-inventory/"
    );

    // Create damaged report linking inventory
    const damagedReport = await damagedInventory.create({
      inventory: inventoryDoc._id,
      warehouse: inventoryDoc.warehouse,
      product: inventoryDoc.product,
      variant: inventoryDoc.variant,
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
    const {
      warehouseId,
      productId,
      variantId,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};
    if (warehouseId) query.warehouse = warehouseId;
    if (productId) query.product = productId;
    if (variantId) query.variant = variantId;

    const reports = await damagedInventory
      .find(query)
      .populate("warehouse product variant uploadedBy", "name email")
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .lean();

    const total = await damagedInventory.countDocuments(query);

    res.status(200).json({
      data: reports,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching damaged inventory reports:", error);
    res
      .status(500)
      .json({ message: "Server error fetching damaged inventory reports" });
  }
};

//report

export const getStockReport = async (req, res) => {
  try {
    const { warehouseId } = req.query;

    if (!warehouseId) {
      return res.status(400).json({ message: "Warehouse ID is required" });
    }

    // Fetch all inventory for the warehouse without pagination
    const inventories = await Inventory.find({ warehouse: warehouseId })
      .populate({
        path: "product",
        select: "productName SKU urlSlug productImages category subcategory",
        populate: [
          {
            path: "category",
            select: "name type categoryCode image parentId",
            populate: { path: "parentId", select: "name" }, // optional parent category
          },
          {
            path: "subcategory",
            select: "name type categoryCode image parentId",
            populate: { path: "parentId", select: "name" }, // optional parent category
          },
        ],
      })
      .populate({
        path: "variant",
        select: "variantName SKU attributes images productId",
        populate: {
          path: "productId",
          select: "productName SKU category subcategory",
          populate: [
            {
              path: "category",
              select: "name type categoryCode image parentId",
              populate: { path: "parentId", select: "name" },
            },
            {
              path: "subcategory",
              select: "name type categoryCode image parentId",
              populate: { path: "parentId", select: "name" },
            },
          ],
        },
      })
      .sort({ updatedAt: -1 })
      .lean();

    if (inventories.length === 0) {
      return res
        .status(404)
        .json({ message: "No inventory found for this warehouse" });
    }

    res.status(200).json({
      data: inventories,
    });
  } catch (error) {
    console.error("Error generating stock report with category:", error);
    res.status(500).json({ message: "Server error generating stock report" });
  }
};

export const getProductReport = async (req, res) => {
  try {
    const { productId, variantId, warehouseId, fromDate, toDate } = req.query;

    if (!productId && !variantId) {
      return res
        .status(400)
        .json({ message: "Product ID or Variant ID is required" });
    }

    const query = {};
    if (productId) query.product = productId;
    if (variantId) query.variant = variantId;
    if (warehouseId) query.warehouse = warehouseId;

    // Date range filter on createdAt
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        query.createdAt.$lte = to;
      }
    }

    const logs = await inventoryLog
      .find(query)
      .populate(
        "inventory warehouse product variant updatedBy",
        "name email SKU"
      )
      .populate({
        path: "variant",
        populate: {
          path: "productId",
          select: "productName SKU urlSlug",
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    if (logs.length === 0) {
      return res.status(404).json({ message: "No transaction logs found" });
    }

    // Add transactionType ("in" or "out") to each log
    const logsWithType = logs.map((log) => {
      let transactionType = "none";
      if (log.newQuantity > log.previousQuantity) transactionType = "in";
      else if (log.newQuantity < log.previousQuantity) transactionType = "out";

      return {
        ...log,
        transactionType,
        quantityChange: Math.abs(log.quantityChange),
      };
    });

    // Calculate total in/out quantities
    let totalInQuantity = 0;
    let totalOutQuantity = 0;
    logsWithType.forEach((log) => {
      if (log.transactionType === "in") totalInQuantity += log.quantityChange;
      else if (log.transactionType === "out")
        totalOutQuantity += log.quantityChange;
    });

    res.status(200).json({
      data: logsWithType,
      totalLogs: logsWithType.length,
      totalInQuantity,
      totalOutQuantity,
    });
  } catch (error) {
    console.error("Error fetching product transaction history:", error);
    res
      .status(500)
      .json({ message: "Server error fetching product transaction history" });
  }
};


export const createTransferRequestAdmin = async (req, res) => {
  try {
    console.log("Admin Create Transfer Request - User:", req.user);

    // Admin must be authenticated
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized: User not authenticated",
      });
    }

    // Extract fields from request body
    const {
      fromWarehouse,
      toWarehouse,
      items,
      carrier,
      dispatchTime,
      totalWeight,
      driver
    } = req.body;

    // Validate warehouses
    if (!fromWarehouse) {
      return res.status(400).json({ message: "fromWarehouse is required" });
    }

    if (!toWarehouse) {
      return res.status(400).json({ message: "toWarehouse is required" });
    }

    if (fromWarehouse.toString() === toWarehouse.toString()) {
      return res.status(400).json({
        message: "Source and destination warehouses cannot be the same",
      });
    }

    // Validate driver
    if (!driver) {
      return res.status(400).json({ message: "Driver is required" });
    }

    // Validate items list
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Items must be a non-empty array",
      });
    }

    for (const item of items) {
      if (!item.productId) {
        return res.status(400).json({
          message: "Each item must have a productId",
        });
      }
      if (!item.quantity || item.quantity <= 0) {
        return res.status(400).json({
          message: "Each item must have a quantity greater than zero",
        });
      }
    }

    // Create transfer request
    const transferRequest = await TransferRequest.create({
      fromWarehouse,
      toWarehouse,
      items,
      carrier,
      dispatchTime: dispatchTime ? new Date(dispatchTime) : null,
      totalWeight,
      driver,
      createdBy: req.user._id, // optional: track admin who created it
    });

    res.status(201).json({
      message: "Transfer request created successfully",
      data: transferRequest,
    });
  } catch (err) {
    console.error("Admin create transfer request error:", err);
    res.status(500).json({
      message: "Server error creating transfer request",
      error: err.message,
    });
  }
};
