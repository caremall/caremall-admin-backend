import Purchase from "../../models/Purchase.mjs";
import Counter from "../../models/Counter.mjs";
import Inventory from "../../models/inventory.mjs";
import inventoryLog from "../../models/inventoryLog.mjs";

async function getNextSequence(name = "purchase") {
  const updated = await Counter.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return updated.seq;
}

function round2(n) {
  return Number(Number(n || 0).toFixed(2));
}

export const createPurchase = async (req, res) => {
  try {
    const {
      supplier,
      warehouse: warehouseFromBody,
      date,
      supplierRefNo,
      supplierRefDate,
      items,
      narration,
      roundOff: addRoundOff = 0,
    } = req.body;

    if (!supplier)
      return res.status(400).json({ message: "Supplier is required" });
    if (!warehouseFromBody && !req.user?.assignedWarehouses) {
      return res.status(400).json({ message: "Warehouse is required" });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one purchase item is required" });
    }

    // Determine warehouse (same logic as inbound)
    const warehouse = Array.isArray(req.user?.assignedWarehouses)
      ? req.user.assignedWarehouses[0]?._id || warehouseFromBody
      : req.user?.assignedWarehouses?._id || warehouseFromBody;

    // Validate items minimally
    for (const item of items) {
      if (!item.product && !item.variant) {
        return res
          .status(400)
          .json({ message: "Each item must have product or variant" });
      }
      if (
        item.quantity === undefined ||
        item.quantity === null ||
        item.quantity < 0
      ) {
        return res
          .status(400)
          .json({ message: "Item quantity must be a non-negative number" });
      }
      if (item.rate === undefined || item.rate === null || item.rate < 0) {
        return res
          .status(400)
          .json({ message: "Item rate must be a non-negative number" });
      }
    }

    // Calculate totals:
    let subTotal = 0;
    let totalVat = 0;

    // Treat item.vat as percentage (e.g., 5 means 5%)
    const normalizedItems = items.map((it) => {
      const qty = Number(it.quantity || 0);
      const rate = Number(it.rate || 0);
      const lineTotal = qty * rate;
      const vatPercent = Number(it.vat || 0);
      const vatAmount = (lineTotal * vatPercent) / 100;

      subTotal += lineTotal;
      totalVat += vatAmount;

      return {
        barcode: it.barcode,
        product: it.product || null,
        variant: it.variant || null,
        unit: it.unit,
        batch: it.batch,
        expiry: it.expiry,
        quantity: qty,
        rate: rate,
        sellingRate: it.sellingRate || 0,
        vat: vatPercent,
        total: round2(lineTotal),
        description: it.description || "",
      };
    });

    subTotal = round2(subTotal);
    totalVat = round2(totalVat);

    const roundOff = round2(Number(addRoundOff));
    const grandTotal = round2(subTotal + totalVat + roundOff);

    // Generate purchase number (auto-increment)
    const seq = await getNextSequence("purchase");
    const purchaseNumber = `PO-${String(seq).padStart(6, "0")}`;

    // Create purchase doc
    const purchaseDoc = await Purchase.create({
      purchaseNumber,
      supplier,
      warehouse,
      date,
      supplierRefNo,
      supplierRefDate,
      items: normalizedItems,
      subTotal,
      totalVat,
      roundOff,
      grandTotal,
      narration,
    });

    // Update inventory for each item (same logic as inbound)
    const inventoryUpdates = [];
    for (const it of normalizedItems) {
      const productId = it.product || null;
      const variantId = it.variant || null;
      const receivedQty = Number(it.quantity || 0);
      const itemWarehouseLocation = it.warehouseLocation || null;

      // Build inventory query
      const query = { warehouse };
      if (productId && variantId) {
        query.product = productId;
        query.variant = variantId;
      } else if (productId) {
        query.product = productId;
        query.variant = null;
      } else if (variantId) {
        query.variant = variantId;
        query.product = null;
      }

      let inventory = await Inventory.findOne(query);

      let previousQuantity = 0;
      let newQuantity = receivedQty;

      if (!inventory) {
        inventory = new Inventory({
          warehouse,
          product: productId || null,
          variant: variantId || null,
          AvailableQuantity: receivedQty,
          minimumQuantity: 0,
          reorderQuantity: 0,
          maximumQuantity: 0,
          warehouseLocation: itemWarehouseLocation,
        });
        previousQuantity = 0;
        newQuantity = receivedQty;
      } else {
        previousQuantity = inventory.AvailableQuantity || 0;
        newQuantity = previousQuantity + receivedQty;
        inventory.AvailableQuantity = newQuantity;
        if (itemWarehouseLocation)
          inventory.warehouseLocation = itemWarehouseLocation;
      }

      inventory.updatedAt = new Date();
      await inventory.save();

      // Audit log
      await inventoryLog.create({
        inventory: inventory._id,
        product: productId,
        variant: variantId,
        warehouse,
        previousQuantity,
        quantityChange: receivedQty,
        newQuantity,
        reasonForUpdate: "Purchase Receipt",
        note: `Purchase ${purchaseNumber}`,
        warehouseLocation: itemWarehouseLocation,
        updatedBy: req.user?._id,
      });

      inventoryUpdates.push({
        inventory: {
          _id: inventory._id,
          warehouse: inventory.warehouse,
          product: inventory.product,
          variant: inventory.variant,
          AvailableQuantity: inventory.AvailableQuantity,
          warehouseLocation: inventory.warehouseLocation,
        },
        previousQuantity,
        quantityChange: receivedQty,
        newQuantity,
      });
    }

    return res.status(201).json({
      message: "Purchase saved and inventory updated",
      purchase: purchaseDoc,
      inventoryUpdates,
    });
  } catch (err) {
    console.error("Error creating purchase:", err);
    return res
      .status(500)
      .json({ message: "Server error creating purchase", error: err.message });
  }
};

/**
 * Get purchases - filtered by user's warehouse(s) if present
 */
export const getPurchases = async (req, res) => {
  try {
    const { supplier } = req.query;
    const query = {};

    // determine allowed warehouse (similar to inbound)
    const warehouseId = Array.isArray(req.user?.assignedWarehouses)
      ? req.user.assignedWarehouses[0]?._id
      : req.user?.assignedWarehouses?._id;

    if (warehouseId) query.warehouse = warehouseId;
    if (supplier) query.supplier = supplier;

    const purchases = await Purchase.find(query)
      .populate("supplier")
      .populate("warehouse")
      .populate("items.product")
      .populate("items.variant")
      .lean();

    return res.status(200).json({ data: purchases });
  } catch (err) {
    console.error("Error fetching purchases:", err);
    return res.status(500).json({ message: "Server error fetching purchases" });
  }
};

export const getPurchaseById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Purchase ID is required" });
    }

    // Determine user's warehouse access
    const warehouseId = Array.isArray(req.user?.assignedWarehouses)
      ? req.user.assignedWarehouses[0]?._id
      : req.user?.assignedWarehouses?._id;

    const query = { _id: id };
    if (warehouseId) query.warehouse = warehouseId;

    const purchase = await Purchase.findOne(query)
      .populate("supplier")
      .populate("warehouse")
      .populate("items.product")
      .populate("items.variant")
      .lean();

    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    return res.status(200).json({ data: purchase });
  } catch (err) {
    console.error("Error fetching purchase by ID:", err);
    return res
      .status(500)
      .json({ message: "Server error fetching purchase details" });
  }
};

export const updatePurchase = async (req, res) => {
  try {
    const { id } = req.params;

    const oldPurchase = await Purchase.findById(id);
    if (!oldPurchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    // 1) ROLLBACK INVENTORY (reverse old purchase)
    for (const oldItem of oldPurchase.items) {
      const productId = oldItem.product || null;
      const variantId = oldItem.variant || null;
      const returnedQty = Number(oldItem.quantity || 0);

      const query = { warehouse: oldPurchase.warehouse };
      if (productId && variantId) {
        query.product = productId;
        query.variant = variantId;
      } else if (productId) {
        query.product = productId;
        query.variant = null;
      } else if (variantId) {
        query.variant = variantId;
        query.product = null;
      }

      const inventory = await Inventory.findOne(query);

      if (inventory) {
        const prevQty = inventory.AvailableQuantity;
        const newQty = prevQty - returnedQty;

        inventory.AvailableQuantity = newQty < 0 ? 0 : newQty;
        inventory.updatedAt = new Date();
        await inventory.save();

        await inventoryLog.create({
          inventory: inventory._id,
          product: productId,
          variant: variantId,
          warehouse: oldPurchase.warehouse,
          previousQuantity: prevQty,
          quantityChange: -returnedQty,
          newQuantity: inventory.AvailableQuantity,
          reasonForUpdate: "Purchase Update (Rollback)",
          note: `Purchase update rollback: ${oldPurchase.purchaseNumber}`,
          updatedBy: req.user?._id,
        });
      }
    }

    // 2) APPLY NEW PURCHASE DATA
    const {
      supplier,
      warehouse,
      date,
      supplierRefNo,
      supplierRefDate,
      items,
      narration,
      roundOff: addRoundOff = 0,
    } = req.body;

    if (!items || items.length === 0) {
      return res
        .status(400)
        .json({ message: "Purchase items cannot be empty" });
    }

    // Recalculate totals
    let subTotal = 0;
    let totalVat = 0;

    const newItems = items.map((it) => {
      const qty = Number(it.quantity);
      const rate = Number(it.rate);
      const lineTotal = qty * rate;

      const vatPercent = Number(it.vat || 0);
      const vatAmount = (lineTotal * vatPercent) / 100;

      subTotal += lineTotal;
      totalVat += vatAmount;

      return {
        barcode: it.barcode,
        product: it.product,
        variant: it.variant,
        unit: it.unit,
        batch: it.batch,
        expiry: it.expiry,
        quantity: qty,
        rate: rate,
        sellingRate: it.sellingRate || 0,
        vat: vatPercent,
        total: round2(lineTotal),
        description: it.description || "",
      };
    });

    subTotal = round2(subTotal);
    totalVat = round2(totalVat);

    const roundOff = round2(Number(addRoundOff));
    const grandTotal = round2(subTotal + totalVat + roundOff);

    // UPDATE PURCHASE DOCUMENT
    oldPurchase.supplier = supplier;
    oldPurchase.warehouse = warehouse;
    oldPurchase.date = date;
    oldPurchase.supplierRefNo = supplierRefNo;
    oldPurchase.supplierRefDate = supplierRefDate;
    oldPurchase.items = newItems;
    oldPurchase.subTotal = subTotal;
    oldPurchase.totalVat = totalVat;
    oldPurchase.roundOff = roundOff;
    oldPurchase.grandTotal = grandTotal;
    oldPurchase.narration = narration;

    await oldPurchase.save();

    // 3) APPLY NEW INVENTORY UPDATE
    for (const it of newItems) {
      const productId = it.product;
      const variantId = it.variant;
      const qty = Number(it.quantity);

      const query = { warehouse };
      if (productId && variantId) {
        query.product = productId;
        query.variant = variantId;
      } else if (productId) {
        query.product = productId;
        query.variant = null;
      } else if (variantId) {
        query.variant = variantId;
        query.product = null;
      }

      let inventory = await Inventory.findOne(query);

      if (!inventory) {
        inventory = await Inventory.create({
          warehouse,
          product: productId || null,
          variant: variantId || null,
          AvailableQuantity: qty,
        });

        await inventoryLog.create({
          inventory: inventory._id,
          product: productId,
          variant: variantId,
          warehouse,
          previousQuantity: 0,
          quantityChange: qty,
          newQuantity: qty,
          reasonForUpdate: "Purchase Update",
          note: `Updated Purchase ${oldPurchase.purchaseNumber}`,
          updatedBy: req.user?._id,
        });
      } else {
        const previous = inventory.AvailableQuantity;
        const newQty = previous + qty;

        inventory.AvailableQuantity = newQty;
        await inventory.save();

        await inventoryLog.create({
          inventory: inventory._id,
          product: productId,
          variant: variantId,
          warehouse,
          previousQuantity: previous,
          quantityChange: qty,
          newQuantity: newQty,
          reasonForUpdate: "Purchase Update",
          note: `Updated Purchase ${oldPurchase.purchaseNumber}`,
          updatedBy: req.user?._id,
        });
      }
    }

    return res.status(200).json({
      message: "Purchase updated successfully",
      purchase: oldPurchase,
    });
  } catch (err) {
    console.error("Error updating purchase:", err);
    res.status(500).json({ message: "Server error updating purchase" });
  }
};

export const deletePurchase = async (req, res) => {
  try {
    const { id } = req.params;

    const purchase = await Purchase.findById(id);
    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    const warehouse = purchase.warehouse;

    // 1) ROLLBACK INVENTORY
    for (const item of purchase.items) {
      const productId = item.product;
      const variantId = item.variant;
      const qty = Number(item.quantity);

      const query = { warehouse };
      if (productId && variantId) {
        query.product = productId;
        query.variant = variantId;
      } else if (productId) {
        query.product = productId;
        query.variant = null;
      } else if (variantId) {
        query.variant = variantId;
        query.product = null;
      }

      const inventory = await Inventory.findOne(query);
      if (inventory) {
        const previous = inventory.AvailableQuantity;
        const newQty = previous - qty;

        inventory.AvailableQuantity = newQty < 0 ? 0 : newQty;
        await inventory.save();

        await inventoryLog.create({
          inventory: inventory._id,
          product: productId,
          variant: variantId,
          warehouse,
          previousQuantity: previous,
          quantityChange: -qty,
          newQuantity: inventory.AvailableQuantity,
          reasonForUpdate: "Purchase Deleted",
          note: `Deleted Purchase ${purchase.purchaseNumber}`,
          updatedBy: req.user?._id,
        });
      }
    }

    // 2) DELETE PURCHASE DOCUMENT
    await Purchase.findByIdAndDelete(id);

    return res.status(200).json({ message: "Purchase deleted successfully" });
  } catch (err) {
    console.error("Error deleting purchase:", err);
    res.status(500).json({ message: "Server error deleting purchase" });
  }
};
