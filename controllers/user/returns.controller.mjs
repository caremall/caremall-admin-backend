import Return from "../../models/Return.mjs";
import Order from "../../models/Order.mjs";
import Inventory from "../../models/inventory.mjs";

export const createReturnRequest = async (req, res) => {
  const userId = req.user._id;
  const {
    order,
    product,
    variant,
    quantity,
    priceAtOrder,
    reason,
    refundAmount,
    comments,
  } = req.body;

  // Create return record
  const newReturn = await Return.create({
    order,
    user: userId,
    item: {
      product,
      variant,
      quantity,
      priceAtOrder,
    },
    reason,
    refundAmount,
    comments,
  });

  // Fetch warehouse from order (assuming order stores warehouse)
  const orderDoc = await Order.findById(order);
  const warehouseId = orderDoc.warehouse; // Ensure your Order model includes warehouse info

  // Find inventory record for this warehouse/product/variant
  let inventoryRecord;
  if (variant) {
    inventoryRecord = await Inventory.findOne({
      warehouse: warehouseId,
      variant,
    });
  } else {
    inventoryRecord = await Inventory.findOne({
      warehouse: warehouseId,
      product,
    });
  }

  // If found, increase availableQuantity
  if (inventoryRecord) {
    inventoryRecord.availableQuantity += quantity;
    await inventoryRecord.save();
  } else {
    // Optionally create inventory record if not exists
    // Or return an error/log if this should never happen
    console.log("no inventory record");
  }

  res.status(201).json({ success: true, return: newReturn });
};

export const getUserReturns = async (req, res) => {
  try {
    const userId = req.user._id;

    const returns = await Return.find({ user: userId })
      .populate("order", "orderStatus paymentStatus totalAmount")
      .populate("item.product")
      .populate("item.variant");

    res.json({ success: true, returns });
  } catch (err) {
    console.error("Error fetching returns:", err);
    res.status(500).json({ success: false, message: "Failed to get returns" });
  }
};

export const getReturnById = async (req, res) => {
  try {
    const returnId = req.params.id;
    const userId = req.user._id;

    const returnDoc = await Return.findOne({ _id: returnId, user: userId })
      .populate("order", "orderStatus paymentStatus")
      .populate("item.product", "productName")
      .populate("item.variant", "variantAttributes");

    if (!returnDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Return not found" });
    }

    res.json({ success: true, return: returnDoc });
  } catch (err) {
    console.error("Error fetching return:", err);
    res.status(500).json({ success: false, message: "Failed to fetch return" });
  }
};

export const getReturnsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;

    const returns = await Return.findOne({
      user: userId,
      "item.product": productId,
    })
      .populate("order", "orderStatus paymentStatus totalAmount")
      .populate("item.product", "productName")
      .populate("item.variant", "variantAttributes");

    if (!returns || returns.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No returns found for this product" });
    }

    res.json({ success: true, returns });
  } catch (err) {
    console.error("Error fetching returns by product:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to get returns by product" });
  }
};

export const getReturnByOrderAndProduct = async (req, res) => {
  try {
    const { orderId, productId } = req.params;
    const userId = req.user._id; // ensures logged-in user only

    const returnDoc = await Return.findOne({
      user: userId,
      order: orderId,
      "item.product": productId,
    })
      .populate("order", "orderStatus paymentStatus totalAmount")
      .populate("item.product", "productName")
      .populate("item.variant", "variantAttributes");

    if (!returnDoc) {
      return res
        .status(404)
        .json({ success: false, message: "No return found for this order & product" });
    }

    res.json({ success: true, return: returnDoc });
  } catch (err) {
    console.error("Error fetching return by order & product:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to get return by order & product" });
  }
};


export const cancelReturnRequest = async (req, res) => {
  try {
    const returnId = req.params.id;
    const userId = req.user._id;

    const returnDoc = await Return.findOne({ _id: returnId, user: userId });

    if (!returnDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Return not found" });
    }

    if (returnDoc.status !== "requested") {
      return res
        .status(400)
        .json({
          success: false,
          message: "Cannot cancel after approval or rejection",
        });
    }

    await Return.deleteOne({ _id: returnId });
    res.json({ success: true, message: "Return request cancelled" });
  } catch (err) {
    console.error("Error cancelling return:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to cancel return" });
  }
};
