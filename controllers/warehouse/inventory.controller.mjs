import damagedInventory from "../../models/damagedInventory.mjs";
import Inbound from "../../models/Inbound.mjs";
import Inventory from "../../models/inventory.mjs";
import inventoryLog from "../../models/inventoryLog.mjs";
import TransferRequest from "../../models/TransferRequest.mjs";
import { uploadBase64Images } from "../../utils/uploadImage.mjs";
import Product from "../../models/Product.mjs";
import mongoose from "mongoose";


export const getTransactionByID = async (req, res) => {
  const assignedWarehouses = req.user.assignedWarehouses;
  console.log("Get Transaction by ID - User:", req.user);
  
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID is required",
      });
    }

    const transaction = await TransferRequest.findById(id)
      .populate({
        path: "fromWarehouse",
        select: "name address contactPerson phoneNumber email"
      })
      .populate({
        path: "toWarehouse",
        select: "name address contactPerson phoneNumber email"
      })
      .populate({
        path: "driver",
        select: "name address contactPerson phoneNumber email"
      })
      .populate({
        path: "items.productId",
        select: "productName shortDescription SKU barcode costPrice mrpPrice sellingPrice discountPercent weight dimensions productImages productStatus hasVariant brand category subcategory",
        populate: [
          { path: "brand", select: "brandName" }, 
          { path: "category", select: "name" },
          { path: "subcategory", select: "name" },
        ],
      })
      .populate({
        path: "items.variantId",
        select: "SKU barcode costPrice mrpPrice sellingPrice discountPercent weight dimensions images variantAttributes productId",
        populate: {
          path: "productId",
          select: "productName brand category subcategory",
          populate: [
            { path: "brand", select: "brandName" },
            { path: "category", select: "name" },
            { path: "subcategory", select: "name" },
          ],
        },
      })
      .lean();

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    // Get user's assigned warehouse IDs
    let userWarehouseIds = [];
    if (Array.isArray(assignedWarehouses)) {
      userWarehouseIds = assignedWarehouses.map(wh => wh._id?.toString()).filter(id => id);
    } else if (assignedWarehouses && assignedWarehouses._id) {
      userWarehouseIds = [assignedWarehouses._id.toString()];
    }

    // Determine transfer type for the current user
    let transferType = 'unknown';
    const fromWarehouseId = transaction.fromWarehouse?._id?.toString();
    const toWarehouseId = transaction.toWarehouse?._id?.toString();

    if (userWarehouseIds.includes(fromWarehouseId) && userWarehouseIds.includes(toWarehouseId)) {
      transferType = 'internal';
    } else if (userWarehouseIds.includes(fromWarehouseId)) {
      transferType = 'outgoing';
    } else if (userWarehouseIds.includes(toWarehouseId)) {
      transferType = 'incoming';
    }

    // Get all product and variant IDs to fetch inventory quantities
    const productIds = [];
    const variantIds = [];
    
    transaction.items?.forEach(item => {
      if (item.productId) {
        productIds.push(item.productId._id);
      }
      if (item.variantId) {
        variantIds.push(item.variantId._id);
      }
    });

    // Fetch inventory data for available quantities
    const inventoryData = await Inventory.find({
      $or: [
        { product: { $in: productIds }, variant: null },
        { variant: { $in: variantIds } }
      ]
    }).lean();

    // Create a map for quick lookup of available quantities
    const inventoryMap = new Map();
    
    inventoryData.forEach(inv => {
      if (inv.variant) {
        inventoryMap.set(`variant_${inv.variant.toString()}`, inv.AvailableQuantity);
      } else {
        inventoryMap.set(`product_${inv.product.toString()}`, inv.AvailableQuantity);
      }
    });

    const transformedData = {
      ...transaction,
      transferType: transferType, // Add transfer type to response
      isOutgoing: transferType === 'outgoing', // Boolean for easy check
      isIncoming: transferType === 'incoming', // Boolean for easy check
      isInternal: transferType === 'internal', // Boolean for easy check
      items: transaction.items?.map((item) => {
        let availableQuantity = 0;
        
        // Determine available quantity based on whether it's a variant or product
        if (item.variantId) {
          // For variant products, get quantity from variant inventory
          availableQuantity = inventoryMap.get(`variant_${item.variantId._id.toString()}`) || 0;
        } else if (item.productId) {
          // For non-variant products, get quantity from product inventory
          availableQuantity = inventoryMap.get(`product_${item.productId._id.toString()}`) || 0;
        }

        return {
          ...item,
          productId: item.productId
            ? {
                _id: item.productId._id,
                productName: item.productId.productName || "Unknown Product",
                shortDescription: item.productId.shortDescription || "",
                SKU: item.productId.SKU || "",
                barcode: item.productId.barcode || "",
                costPrice: item.productId.costPrice || 0,
                mrpPrice: item.productId.mrpPrice || 0,
                sellingPrice: item.productId.sellingPrice || 0,
                discountPercent: item.productId.discountPercent || 0,
                weight: item.productId.weight || 0,
                dimensions: item.productId.dimensions || {},
                productImages: item.productId.productImages || [],
                productStatus: item.productId.productStatus || "unknown",
                availableQuantity: availableQuantity, // Use calculated available quantity
                hasVariant: item.productId.hasVariant || false,
                brand: item.productId.brand?.brandName || "N/A",
                category: item.productId.category?.name || "N/A",
                subCategory: item.productId.subcategory?.name || "N/A",
              }
            : null,
          variantId: item.variantId
            ? {
                _id: item.variantId._id,
                SKU: item.variantId.SKU || "",
                barcode: item.variantId.barcode || "",
                costPrice: item.variantId.costPrice || 0,
                mrpPrice: item.variantId.mrpPrice || 0,
                sellingPrice: item.variantId.sellingPrice || 0,
                discountPercent: item.variantId.discountPercent || 0,
                weight: item.variantId.weight || 0,
                dimensions: item.variantId.dimensions || {},
                images: item.variantId.images || [],
                stockQuantity: availableQuantity, // Use calculated available quantity for variants
                variantAttributes: item.variantId.variantAttributes || [],
                productId: item.variantId.productId
                  ? {
                      productName: item.variantId.productId.productName || "Unknown Product",
                      brand: item.variantId.productId.brand?.brandName || "N/A",
                      category: item.variantId.productId.category?.name || "N/A",
                      subCategory: item.variantId.productId.subcategory?.name || "N/A",
                    }
                  : null,
              }
            : null,
        };
      }),
    };

    console.log(`Transfer ${id} is ${transferType} for user ${req.user._id}`);
    console.log(`User warehouses: ${userWarehouseIds.join(', ')}`);
    console.log(`From: ${fromWarehouseId}, To: ${toWarehouseId}`);

    res.status(200).json({
      success: true,
      data: transformedData,
    });
  } catch (err) {
    console.error("Get transaction by ID error:", err);
    
    // More specific error handling
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID format",
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Server error fetching transaction",
      error: err.message,
    });
  }
};


export const createTransferRequest = async (req, res) => {
  try {
    console.log("Create Transfer Request - User:", req.user);

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: User not authenticated" });
    }

    const assignedWarehouses = req.user.assignedWarehouses;
    const fromWarehouse = Array.isArray(assignedWarehouses)
      ? assignedWarehouses[0]?._id
      : assignedWarehouses?._id;

    if (!fromWarehouse) {
      return res.status(400).json({ message: "User does not have an assigned warehouse to transfer from" });
    }

    
    const {
      toWarehouse,
      items,
      carrier,
      dispatchTime,
      totalWeight,
      driver 
    } = req.body;

    console.log('Dynamic From Warehouse:', fromWarehouse);
    console.log('To Warehouse from request:', toWarehouse);

    if (!toWarehouse) {
      return res.status(400).json({ message: "toWarehouse is required" });
    }

    
    if (!driver) {
      return res.status(400).json({ message: "Driver is required" });
    }

    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items must be a non-empty array" });
    }

    
    for (const item of items) {
      if (!item.productId) {
        return res.status(400).json({ message: "Each item must have a productId" });
      }
      if (!item.quantity || item.quantity <= 0) {
        return res.status(400).json({ message: "Each item must have a quantity greater than zero" });
      }
    }

    if (fromWarehouse.toString() === toWarehouse.toString()) {
      return res.status(400).json({ 
        message: "Source and destination warehouses cannot be the same" 
      });
    }

    const transferRequest = await TransferRequest.create({
      fromWarehouse, 
      toWarehouse,   
      items,         
      carrier,
      dispatchTime: dispatchTime ? new Date(dispatchTime) : null,
      totalWeight,
      driver 
    });

    res.status(201).json({ 
      message: "Transfer request created successfully", 
      data: transferRequest 
    });
  } catch (err) {
    console.error("Create transfer request error:", err.message, err.stack);
    res.status(500).json({ 
      message: "Server error creating transfer request", 
      error: err.message 
    });
  }
};


export const getTransferRequests = async (req, res) => {
  try {
    const { status, type } = req.query;
    const query = {};

    // Get user's assigned warehouses
    const assignedWarehouses = req.user.assignedWarehouses;
    
    // Extract warehouse IDs from assigned warehouses
    let userWarehouseIds = [];
    
    if (Array.isArray(assignedWarehouses)) {
      userWarehouseIds = assignedWarehouses.map(wh => wh._id).filter(id => id);
    } else if (assignedWarehouses && assignedWarehouses._id) {
      userWarehouseIds = [assignedWarehouses._id];
    }

    // If user has assigned warehouses, filter transfers accordingly
    if (userWarehouseIds.length > 0) {
      if (type === 'outgoing') {
        // Only get transfers FROM user's warehouses
        query.fromWarehouse = { $in: userWarehouseIds };
      } else if (type === 'incoming') {
        // Only get transfers TO user's warehouses
        query.toWarehouse = { $in: userWarehouseIds };
      } else {
        // Default: get both incoming and outgoing transfers
        query.$or = [
          { fromWarehouse: { $in: userWarehouseIds } },
          { toWarehouse: { $in: userWarehouseIds } }
        ];
      }
    }

    // Filter by status if provided
    if (status) query.status = status;

    const transferRequests = await TransferRequest.find(query)
      .populate("fromWarehouse toWarehouse driver")
      .sort({ requestedAt: -1 })
      .lean();

    // Add transfer type information to each request
    const transferRequestsWithType = transferRequests.map(request => {
      const isFromUserWarehouse = userWarehouseIds.some(id => 
        id.toString() === request.fromWarehouse._id.toString()
      );
      const isToUserWarehouse = userWarehouseIds.some(id => 
        id.toString() === request.toWarehouse._id.toString()
      );

      let transferType = 'other';
      if (isFromUserWarehouse && isToUserWarehouse) {
        transferType = 'internal';
      } else if (isFromUserWarehouse) {
        transferType = 'outgoing';
      } else if (isToUserWarehouse) {
        transferType = 'incoming';
      }

      return {
        ...request,
        transferType
      };
    });

    res.status(200).json({
      data: transferRequestsWithType,
    });
  } catch (err) {
    console.error("Get transfer requests error:", err);
    res.status(500).json({
      message: "Server error fetching transfer requests",
    });
  }
};















export const getTransferRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transfer request ID"
      });
    }

    const transferRequest = await TransferRequest.findById(id)
      .populate("fromWarehouse toWarehouse driver items.productId items.variantId")
      .lean();

    if (!transferRequest) {
      return res.status(404).json({
        success: false,
        message: "Transfer request not found"
      });
    }

    res.status(200).json({
      success: true,
      data: transferRequest
    });
  } catch (err) {
    console.error("Get transfer request by ID error:", err);
    res.status(500).json({
      success: false,
      message: "Server error fetching transfer request",
    });
  }
};

export const updateTransferStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { manifestStatus, pickStatus, packStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transfer request ID"
      });
    }

    const updateData = {};
    if (manifestStatus) updateData.manifestStatus = manifestStatus;
    if (pickStatus) updateData.pickStatus = pickStatus;
    if (packStatus) updateData.packStatus = packStatus;

    if (manifestStatus === 'in-transit') {
      updateData.shippedAt = new Date();
    } else if (manifestStatus === 'delivered') {
      updateData.receivedAt = new Date();
    }

    const transferRequest = await TransferRequest.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate("fromWarehouse toWarehouse driver items.productId items.variantId");

    if (!transferRequest) {
      return res.status(404).json({
        success: false,
        message: "Transfer request not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Transfer status updated successfully",
      data: transferRequest
    });
  } catch (err) {
    console.error("Update transfer status error:", err);
    res.status(500).json({
      success: false,
      message: "Server error updating transfer status",
    });
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
// Bulk update inventory quantities
export const updateInventory = async (req, res) => {
  try {
    const assignedWarehouses = req.user.assignedWarehouses;
    const warehouseId = Array.isArray(assignedWarehouses)
      ? assignedWarehouses[0]?._id
      : assignedWarehouses?._id;

    const { updates, productId, variantId, quantityChange, note, reasonForUpdate, warehouseLocation } = req.body;

    // If updates array exists, process as bulk update
    if (updates && Array.isArray(updates)) {
      // Bulk update logic
      const results = [];
      const errors = [];

      for (const update of updates) {
        try {
          const { productId, variantId, quantityChange, note, reasonForUpdate, warehouseLocation } = update;

          // Input validation for each update
          if (!productId || quantityChange === undefined || quantityChange === null) {
            errors.push({
              productId,
              variantId,
              error: "Product ID and quantity change are required"
            });
            continue;
          }

          const query = {
            warehouse: warehouseId,
            product: productId,
            variant: variantId || null
          };

          let inventory = await Inventory.findOne(query);

          if (inventory) {
            const previousQuantity = inventory.AvailableQuantity;
            const newQuantity = inventory.AvailableQuantity + quantityChange;
            
            if (newQuantity < 0) {
              errors.push({
                productId,
                variantId,
                error: "Insufficient stock",
                currentQuantity: inventory.AvailableQuantity,
                attemptedChange: quantityChange
              });
              continue;
            }

            inventory.AvailableQuantity = newQuantity;
            inventory.updatedAt = new Date();
            
            if (warehouseLocation) {
              inventory.warehouseLocation = warehouseLocation;
            }
            
            await inventory.save();

            // Create inventory log for update
            await inventoryLog.create({
              inventory: inventory._id,
              product: productId,
              variant: variantId || null,
              warehouse: warehouseId,
              previousQuantity: previousQuantity,
              quantityChange: quantityChange,
              newQuantity: newQuantity,
              reasonForUpdate: reasonForUpdate,
              note: note,
              warehouseLocation: warehouseLocation || null,
              updatedBy: req.user._id,
            });

            results.push(inventory);
          } else {
            if (quantityChange < 0) {
              errors.push({
                productId,
                variantId,
                error: "Cannot create with negative quantity",
                attemptedQuantity: quantityChange
              });
              continue;
            }

            const newInventory = new Inventory({
              warehouse: warehouseId,
              product: productId,
              variant: variantId || null,
              AvailableQuantity: quantityChange,
              warehouseLocation: warehouseLocation || null,
              updatedAt: new Date(),
            });

            await newInventory.save();

            // Create inventory log for creation
            await inventoryLog.create({
              inventory: newInventory._id,
              product: productId,
              variant: variantId || null,
              warehouse: warehouseId,
              previousQuantity: 0,
              quantityChange: quantityChange,
              newQuantity: quantityChange,
              reasonForUpdate: reasonForUpdate,
              note: note,
              warehouseLocation: warehouseLocation || null,
              updatedBy: req.user._id,
            });

            results.push(newInventory);
          }
        } catch (error) {
          errors.push({
            productId: update.productId,
            variantId: update.variantId,
            error: error.message
          });
        }
      }

      return res.status(errors.length > 0 ? 207 : 200).json({
        success: errors.length === 0,
        message: `Processed ${results.length} successfully, ${errors.length} failed`,
        data: results,
        errors: errors.length > 0 ? errors : undefined
      });
    } 
    // Single update logic
    else {
      // Input validation for single update
      if (!productId || quantityChange === undefined || quantityChange === null) {
        return res.status(400).json({
          success: false,
          message: "Product ID and quantity change are required"
        });
      }

      const query = {
        warehouse: warehouseId,
        product: productId,
        variant: variantId || null
      };

      let inventory = await Inventory.findOne(query);

      if (inventory) {
        const previousQuantity = inventory.AvailableQuantity;
        const newQuantity = inventory.AvailableQuantity + quantityChange;
        
        // Prevent negative inventory if needed (optional)
        if (newQuantity < 0) {
          return res.status(400).json({
            success: false,
            message: "Insufficient stock available",
            currentQuantity: inventory.AvailableQuantity,
            attemptedChange: quantityChange
          });
        }

        inventory.AvailableQuantity = newQuantity;
        inventory.updatedAt = new Date();
        
        // Update warehouseLocation if provided
        if (warehouseLocation) {
          inventory.warehouseLocation = warehouseLocation;
        }
        
        await inventory.save();

        // Create inventory log for update
        await inventoryLog.create({
          inventory: inventory._id,
          product: productId,
          variant: variantId || null,
          warehouse: warehouseId,
          previousQuantity: previousQuantity,
          quantityChange: quantityChange,
          newQuantity: newQuantity,
          reasonForUpdate: reasonForUpdate,
          note: note,
          warehouseLocation: warehouseLocation || null,
          updatedBy: req.user._id,
        });

        return res.status(200).json({
          success: true,
          message: "Inventory updated successfully",
          data: inventory,
        });
      } else {
        // Prevent creating inventory with negative quantity
        if (quantityChange < 0) {
          return res.status(400).json({
            success: false,
            message: "Cannot create new inventory with negative quantity",
            attemptedQuantity: quantityChange
          });
        }

        // Create new inventory document
        const newInventory = new Inventory({
          warehouse: warehouseId,
          product: productId,
          variant: variantId || null,
          AvailableQuantity: quantityChange,
          warehouseLocation: warehouseLocation || null,
          updatedAt: new Date(),
        });

        await newInventory.save();

        // Create inventory log for creation
        await inventoryLog.create({
          inventory: newInventory._id,
          product: productId,
          variant: variantId || null,
          warehouse: warehouseId,
          previousQuantity: 0,
          quantityChange: quantityChange,
          newQuantity: quantityChange,
          reasonForUpdate: reasonForUpdate,
          note: note,
          warehouseLocation: warehouseLocation || null,
          updatedBy: req.user._id,
        });

        return res.status(201).json({
          success: true,
          message: "Inventory created successfully",
          data: newInventory,
        });
      }
    }
  } catch (error) {
    console.error("Inventory update error:", error);
    
    // Handle duplicate key error (due to unique index)
    // if (error.code === 11000) {
    //   return res.status(409).json({
    //     success: false,
    //     message: "Inventory record already exists for this product/variant in warehouse"
    //   });
    // }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};




export const incrementInventory = async (req, res) => {
   const assignedWarehouses = req.user.assignedWarehouses;
    const warehouseId = Array.isArray(assignedWarehouses)
      ? assignedWarehouses[0]?._id
      : assignedWarehouses?._id;
  try {
    const { productId, variantId, quantity = 1 } = req.body;

   

    // Standardized query for variant null/undefined
    const query = {
      warehouse: warehouseId,
      product: productId,
      variant: variantId || null
    };

    let inventory = await Inventory.findOne(query);

    if (inventory) {
      // Just increment and save
      inventory.AvailableQuantity += quantity;
      inventory.updatedAt = new Date();
      await inventory.save();

      return res.status(200).json({
        success: true,
        message: "Inventory updated successfully",
        data: inventory,
      });
    } else {
      // Create new document
      const newInventory = new Inventory({
        warehouse: warehouseId,
        product: productId,
        variant: variantId || null,
        AvailableQuantity: quantity,
        updatedAt: new Date(),
      });

      await newInventory.save();

      return res.status(201).json({
        success: true,
        message: "Inventory created successfully",
        data: newInventory,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};



export const decrementInventory = async (req, res) => {
  try {
    const { productId, variantId, quantity = 1 } = req.body;

    const warehouseId = Array.isArray(req.user?.assignedWarehouses)
      ? req.user.assignedWarehouses[0]?._id
      : req.user?.assignedWarehouses?._id;

    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "No warehouse assigned to user"
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required"
      });
    }

    const inventory = await Inventory.findOne({
      warehouse: warehouseId,
      product: productId,
      variant: variantId || null
    });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory record not found for this warehouse"
      });
    }

    if (inventory.AvailableQuantity < quantity) {
      return res.status(400).json({
        success: false,
        message: "Insufficient inventory quantity"
      });
    }

    inventory.AvailableQuantity -= quantity;
    inventory.updatedAt = new Date();
    await inventory.save();

    res.status(200).json({
      success: true,
      message: "Inventory decremented successfully",
      data: inventory
    });

  } catch (error) {
    console.error("Error decrementing inventory:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};
// Get inventory for user's assigned warehouse
export const getInventory = async (req, res) => {
  try {
    // Get warehouse ID from user's assigned warehouses
    const warehouseId = Array.isArray(req.user?.assignedWarehouses)
      ? req.user.assignedWarehouses[0]?._id
      : req.user?.assignedWarehouses?._id;

    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "No warehouse assigned to user"
      });
    }

    const inventory = await Inventory.find({ warehouse: warehouseId })
      .populate('warehouse', 'name code')
      .populate('product', 'productName SKU productImages hasVariant variants')
      .populate('variant', 'variantAttributes SKU barcode images')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: inventory
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// 📦 Get Recently Updated Inventories
export const getUpdatedInventories = async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query

    const pageSize = Number(limit)
    const skip = (Number(page) - 1) * pageSize

    
    const updatedInventories = await Inventory.find({
      updatedAt: { $gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    })
      .sort({ updatedAt: -1 })
      .populate("warehouse")
      .populate("warehouseLocation")
      .populate({
        path: "variant",
        populate: {
          path: "productId",
          select: "productName SKU urlSlug productImages",
        },
      })
      .populate({
        path: "product",
        select: "productName SKU urlSlug images productDescription productImages"
      })
      .skip(skip)
      .limit(pageSize)

    const totalCount = await Inventory.countDocuments({
      updatedAt: { $gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })

    return res.status(200).json({
      data: updatedInventories,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    })
  } catch (error) {
    console.error("Error fetching updated inventories:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to fetch updated inventories",
      error: error.message,
    })
  }
}


export const getAllInventories = async (req, res) => {
  try {
    const { productId, variantId, page = 1, limit = 50 } = req.query;

    let warehouseId =
      Array.isArray(req.user?.assignedWarehouses)
        ? req.user.assignedWarehouses[0]?._id
        : req.user?.assignedWarehouses?._id;

    // ✅ Build dynamic query
    const query = {};
    if (warehouseId) query.warehouse = warehouseId;
    if (productId) query.product = productId;
    if (variantId) query.variant = variantId;

    const skip = (page - 1) * limit;

    const inventories = await Inventory.find(query)
      .populate("warehouse", "name address")     // ✅ bring warehouse name and address
      .populate("product", "productName SKU barcode productType productImages minimumQuantity reorderQuantity maximumQuantity shortDescription productDescription brand category subcategory costPrice sellingPrice mrpPrice landingSellPrice productStatus") // ✅ bring product details
      .populate("variant", "variantId productId variantAttributes SKU barcode costPrice sellingPrice mrpPrice landingSellPrice minimumQuantity reorderQuantity maximumQuantity images")       // ✅ bring variant details
      // .populate("warehouseLocation", "name code") // ✅ location
      .skip(skip)
      .limit(limit)
      .sort({ updatedAt: -1 });

    const total = await Inventory.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      page,
      limit,
      data: inventories,
    });

  } catch (error) {
    console.error("Error fetching inventories:", error);
    res.status(500).json({ success: false, message: "Server error fetching inventories" });
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
    const warehouseId =
      Array.isArray(req.user?.assignedWarehouses)
        ? req.user.assignedWarehouses[0]?._id
        : req.user?.assignedWarehouses?._id || warehouseFromBody;

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
      // Check if this is a damaged product log
      if (log.damageType || log.reasonForDamage || log.quantityToReport) {
        // Damaged product message
        const itemName = log.product 
          ? `${log.product.productName} (SKU ${log.product.SKU})` 
          : log.variant 
            ? `Variant SKU ${log.variant.SKU}`
            : "Unknown item";
        
        const locationName = log.warehouseLocation
          ? log.warehouseLocation.code || log.warehouseLocation.name || "Unknown Location"
          : "Unknown Location";
        
        const userName = log.updatedBy ? log.updatedBy.fullName : "Unknown User";
        const damageType = log.damageType || "damaged";
        const quantityReported = log.quantityToReport || 0;
        const reason = log.reasonForDamage || "No reason provided";

        const message = `${quantityReported} of ${itemName} marked as ${damageType} at Location ${locationName}, by ${userName}. Reason: ${reason}`;

        return {
          message,
          createdAt: log.createdAt,
          isFavorite: log.isFavorite,
          _id: log._id,
          type: "damaged", // Add type to identify damaged logs
          damageType: log.damageType,
          quantityToReport: log.quantityToReport,
          reasonForDamage: log.reasonForDamage
        };
      } else {
        // Regular inventory update message
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
          ? log.warehouseLocation.code || log.warehouseLocation.name || "Unknown Location"
          : "Unknown Location";
        const userName = log.updatedBy ? log.updatedBy.fullName : "Unknown User";
        const message = `${qtyChange > 0 ? "+" : "-"}${qtyAbs} of ${itemName} was ${action} Location ${locationName}, by ${userName}`;

        return {
          message,
          createdAt: log.createdAt,
          isFavorite: log.isFavorite,
          _id: log._id,
          type: "inventory_update" 
        };
      }
    });

   
    const favoriteLogs = logsWithMessages.filter((log) => log.isFavorite);

  
    const damagedLogs = logsWithMessages.filter((log) => log.type === "damaged");

    res.status(200).json({
      data: logsWithMessages,
      logs: logs,
      favorites: favoriteLogs,
      damaged: damagedLogs
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

    // Fix: Make sure you import InventoryLog properly
    const log = await inventoryLog.findById(id);
    if (!log) {
      return res.status(404).json({ message: "Inventory log not found" });
    }

    // Toggle favorite status
    log.isFavorite = !log.isFavorite;
    await log.save();

    res.status(200).json({
      message: `Inventory log ${log.isFavorite ? "added to favorites" : "removed from favorites"} successfully`,
      isFavorite: log.isFavorite,
      inventoryLog: log,
    });
  } catch (error) {
    console.error("Error toggling favorite inventory log:", error);
    res.status(500).json({ message: "Server error toggling favorite inventory log" });
  }
};

export const createDamagedInventoryReport = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      product, 
      variant, 
      currentQuantity,
      quantityToReport,
      damageType,
      note,
      evidenceImages,
    } = req.body;

    const warehouse =
      Array.isArray(req.user?.assignedWarehouses)
        ? req.user.assignedWarehouses[0]?._id
        : req.user?.assignedWarehouses?._id;
    

    // Validate required fields
    if (!warehouse) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Warehouse ID is required" });
    }
    if (!product && !variant) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: "Either product or variant must be specified" });
    }
    if (typeof currentQuantity !== "number" || currentQuantity < 0) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: "Current quantity must be a non-negative number" });
    }
    if (typeof quantityToReport !== "number" || quantityToReport <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: "Quantity to report must be a positive number" });
    }
    if (quantityToReport > currentQuantity) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: "Quantity to report cannot exceed current quantity" });
    }
    if (!damageType) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Damage type is required" });
    }

    // Upload images (optional)
    const uploadedImageUrls =
      evidenceImages && evidenceImages.length > 0
        ? await uploadBase64Images(evidenceImages, "damaged-inventory/")
        : [];

    // First, find or create the inventory record
    let inventoryRecord;
    try {
      const Inventory = mongoose.model("Inventory");

      // Build correct query based on variant presence
      const query = { warehouse };
      if (variant) {
        query.variant = variant;
      } else {
        query.product = product;
        query.variant = null;
      }

      inventoryRecord = await Inventory.findOne(query).session(session);

      // Create if not exists
      if (!inventoryRecord) {
        const createDoc = {
          warehouse,
          product: variant ? product : product,
          variant: variant || null,
          AvailableQuantity: currentQuantity,
          createdBy: req.user._id,
        };

        const [created] = await Inventory.create([createDoc], { session });
        inventoryRecord = created;
      }
    } catch (inventoryError) {
      console.error("Inventory lookup/creation error:", inventoryError);
      await session.abortTransaction();
      session.endSession();
      return res.status(500).json({ 
        message: "Error processing inventory record",
        error: inventoryError.message 
      });
    }

    // Create damaged inventory report
    const damagedReport = await damagedInventory.create([{
      warehouse,
      product: product || undefined,
      variant: variant || undefined,
      currentQuantity,
      quantityToReport,
      damageType,
      note,
      evidenceImages: uploadedImageUrls,
      uploadedBy: req.user._id,
    }], { session });

    // Create inventory log with the inventory reference
    const inventoryHistory = await inventoryLog.create([{
      inventory: inventoryRecord._id, // Required field
      warehouse,
      product: product || undefined,
      variant: variant || undefined,
      previousQuantity: currentQuantity,
      quantityToReport,
      newQuantity: currentQuantity - quantityToReport,
      reasonForDamage: note,
      damageType,
      note,
      updatedBy: req.user._id
    }], { session });

    
    await mongoose.model("Inventory").findByIdAndUpdate(
      inventoryRecord._id,
      { 
        $inc: { AvailableQuantity: -quantityToReport },
        $set: { updatedBy: req.user._id }
      },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: "Damaged inventory report created successfully",
      damagedReport: damagedReport[0],
      inventoryHistory: inventoryHistory[0],
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Create Damaged Inventory Report Error:", error);
    res.status(500).json({ 
      message: "Internal server error",
      error: error.message 
    });
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

    const warehouseId =
      Array.isArray(req.user?.assignedWarehouses)
        ? req.user.assignedWarehouses[0]?._id
        : req.user?.assignedWarehouses?._id || warehouseFromBody;

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
    const warehouseId =
      Array.isArray(req.user?.assignedWarehouses)
        ? req.user.assignedWarehouses[0]?._id
        : req.user?.assignedWarehouses?._id || warehouseFromBody;
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

    const warehouseId =
      Array.isArray(req.user?.assignedWarehouses)
        ? req.user.assignedWarehouses[0]?._id
        : req.user?.assignedWarehouses?._id || warehouseFromBody;

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
    const warehouseId =
      Array.isArray(req.user?.assignedWarehouses)
        ? req.user.assignedWarehouses[0]?._id
        : req.user?.assignedWarehouses?._id || warehouseFromBody;

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
      .populate("product", "productName SKU productImages")
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
      warehouse: warehouseFromBody,
    } = req.body;

    const warehouse =
      Array.isArray(req.user?.assignedWarehouses)
        ? req.user.assignedWarehouses[0]?._id
        : req.user?.assignedWarehouses?._id || warehouseFromBody;

    if (!warehouse) {
      return res.status(400).json({ message: "Warehouse ID is required" });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Inbound items are required" });
    }

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
    console.log("🔍 req.user.assignedWarehouses =", req.user.assignedWarehouses);

    const warehouseId =
      Array.isArray(req.user?.assignedWarehouses)
        ? req.user.assignedWarehouses[0]?._id
        : req.user?.assignedWarehouses?._id;

    console.log("✅ warehouseId used =", warehouseId);

    const query = {};
    if (warehouseId) query.warehouse = warehouseId;
    if (status) query.status = status;

    const inboundJobs = await Inbound.find(query)
      .populate("supplier")
      .populate("warehouse")
      .populate("allocatedLocation")
      .populate("items.productId")
      .populate("items.variantId")
      .lean();

    console.log("📦 Found inboundJobs:", inboundJobs.length);

    return res.status(200).json({ data: inboundJobs });
  } catch (error) {
    console.error("Error fetching inbound jobs:", error);
    return res.status(500).json({ message: "Server error fetching inbound jobs" });
  }
};


export const getInboundJobById = async (req, res) => {
  try {
    const { id } = req.params;              

    if (!id) {
      return res.status(400).json({ message: "Inbound job ID is required" });
    }

    let warehouseIds = [];
    if (Array.isArray(req.user.assignedWarehouses)) {
      warehouseIds = req.user.assignedWarehouses.map((w) => w._id?.toString());
    } else if (req.user.assignedWarehouses?._id) {
      warehouseIds = [req.user.assignedWarehouses._id.toString()];
    }

    console.log("Inbound ID:", id);
    console.log("Allowed Warehouse IDs:", warehouseIds);

    // ---------- 2. Base query ----------
    const query = { _id: id };
    if (warehouseIds.length > 0) {
      query.warehouse = { $in: warehouseIds };
    }

 
    const inboundJob = await Inbound.findOne(query)
      .populate("supplier")             
      .populate("warehouse")
      .populate("allocatedLocation")
    
      .populate({
        path: "items.productId",
        model: "Product",               
      })
    
      .populate({
        path: "items.variantId",
        model: "Variant",              
        match: { _id: { $ne: null } },
      })
      .lean()
      .exec();

    if (!inboundJob) {
      console.warn("Inbound job not found for given warehouse/user");
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



















export const confirmTransferRequest = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    const { transferRequestId } = req.params;

    // Find the transfer request
    const transferRequest = await TransferRequest.findById(transferRequestId).session(session);
    
    if (!transferRequest) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Transfer request not found"
      });
    }

    if (transferRequest.isConfirmed) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Transfer request is already confirmed"
      });
    }

    // Process each item in the transfer request
    for (const item of transferRequest.items) {
      // Find the inventory record for the source warehouse
      const inventoryQuery = {
        warehouse: transferRequest.fromWarehouse,
        product: item.productId
      };
      
      // Include variantId in query if it exists
      if (item.variantId) {
        inventoryQuery.variant = item.variantId;
      } else {
        inventoryQuery.variant = null;
      }

      const sourceInventory = await Inventory.findOne(inventoryQuery).session(session);

      if (!sourceInventory) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Inventory not found for product ${item.productId} in source warehouse`
        });
      }

      // Check if sufficient quantity is available
      if (sourceInventory.AvailableQuantity < item.quantity) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Insufficient quantity for product ${item.productId}. Available: ${sourceInventory.AvailableQuantity}, Requested: ${item.quantity}`
        });
      }

      // Decrease quantity in source warehouse
      sourceInventory.AvailableQuantity -= item.quantity;
      sourceInventory.updatedAt = new Date();
      await sourceInventory.save({ session });

      // Find or create inventory record in destination warehouse
      const destInventoryQuery = {
        warehouse: transferRequest.toWarehouse,
        product: item.productId
      };
      
      if (item.variantId) {
        destInventoryQuery.variant = item.variantId;
      } else {
        destInventoryQuery.variant = null;
      }

      let destInventory = await Inventory.findOne(destInventoryQuery).session(session);

      if (destInventory) {
        // Update existing inventory
        destInventory.AvailableQuantity += item.quantity;
        destInventory.updatedAt = new Date();
      } else {
        // Create new inventory record
        destInventory = new Inventory({
          warehouse: transferRequest.toWarehouse,
          product: item.productId,
          variant: item.variantId || null,
          AvailableQuantity: item.quantity,
          updatedAt: new Date()
        });
      }

      await destInventory.save({ session });
    }

    // Update transfer request status
    transferRequest.isConfirmed = true;
    transferRequest.confirmedAt = new Date();
    transferRequest.pickStatus = "picked"; // Auto-mark as picked when confirmed
    await transferRequest.save({ session });

    // Commit transaction
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Transfer request confirmed successfully",
      data: transferRequest
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("Error confirming transfer request:", error);
    
    res.status(500).json({
      success: false,
      message: "Failed to confirm transfer request",
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

