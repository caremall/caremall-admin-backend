import Inventory from "../../models/inventory.mjs";
import inventoryLog from "../../models/inventoryLog.mjs";


// Update inventory quantity (add or remove stock)
export const updateInventory = async (req, res) => {
  try {
    const {
      productId, // optional if variantId given
      variantId, // optional if productId given
      quantityChange, // positive to add, negative to remove
      reasonForUpdate,
      note,
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

    // Update inventory quantity and updatedAt
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
