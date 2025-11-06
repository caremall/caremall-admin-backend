import Return from "../../models/Return.mjs";

// @desc    Get all return requests (with optional filters)
// @route   GET /api/admin/returns
export const getAllReturns = async (req, res) => {
  try {
    const { status, refundStatus, page = 1, limit = 10 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (refundStatus) query.refundStatus = refundStatus;

    const skip = (Number(page) - 1) * Number(limit);

    const [returns, total] = await Promise.all([
      Return.find(query)
        .populate("user", "name email")
        .populate({
          path: "order",
          select: "orderStatus createdAt allocatedWarehouse orderId",
          populate: {
            path: "allocatedWarehouse",
            select: "name", 
          },
        })
        .populate("item.product", "productName productImages SKU barcode")
        .populate("item.variant", "variantAttributes images SKU barcode")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Return.countDocuments(query),
    ]);

    res.json({
      data: returns,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error fetching returns:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch returns",
    });
  }
};

// @desc    Get a single return by ID
// @route   GET /api/admin/returns/:id
export const getReturnByIdAdmin = async (req, res) => {
  try {
    const returnDoc = await Return.findById(req.params.id)
      .populate("user", "name email")
      .populate("order", "orderStatus paymentStatus allocatedWarehouse")
      .populate("item.product", "productName")
      .populate("item.variant", "variantAttributes");

    if (!returnDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Return not found" });
    }

    res.json({ success: true, return: returnDoc });
  } catch (err) {
    console.error("Error getting return:", err);
    res.status(500).json({ success: false, message: "Failed to get return" });
  }
};

// @desc    Approve or reject a return
// @route   PATCH /api/admin/returns/:id/status
export const updateReturnStatus = async (req, res) => {
  try {
    const { status, processedAt } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    const returnDoc = await Return.findById(req.params.id);

    if (!returnDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Return not found" });
    }

    returnDoc.status = status;
    returnDoc.processedAt = processedAt || new Date();

    await returnDoc.save();

    res.json({ success: true, return: returnDoc });
  } catch (err) {
    console.error("Error updating return status:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to update return status" });
  }
};

// @desc    Update refund status
// @route   PATCH /api/admin/returns/:id/refund
export const updateRefundStatus = async (req, res) => {
  try {
    const { refundStatus } = req.body;

    if (!["pending", "refunded", "not_applicable"].includes(refundStatus)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid refund status" });
    }

    const returnDoc = await Return.findById(req.params.id);

    if (!returnDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Return not found" });
    }

    returnDoc.refundStatus = refundStatus;

    if (refundStatus === "refunded") {
      returnDoc.refundedAt = new Date();
    }

    await returnDoc.save();

    res.json({ success: true, return: returnDoc });
  } catch (err) {
    console.error("Error updating refund status:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to update refund status" });
  }
};

// @desc    Mark return as completed (after pickup or inspection)
// @route   PATCH /api/admin/returns/:id/complete
export const markReturnComplete = async (req, res) => {
  try {
    const returnDoc = await Return.findById(req.params.id);

    if (!returnDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Return not found" });
    }

    if (returnDoc.status !== "approved") {
      return res
        .status(400)
        .json({
          success: false,
          message: "Return must be approved before completion",
        });
    }

    returnDoc.status = "completed";
    await returnDoc.save();

    res.json({ success: true, return: returnDoc });
  } catch (err) {
    console.error("Error marking return as complete:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to complete return" });
  }
};

// @desc    Update pickup status for return
// @route   PATCH /api/admin/returns/:id/pickup
export const updatePickupStatus = async (req, res) => {
  try {
    const { pickupScheduled, pickupDate, pickupStatus } = req.body;

    const returnDoc = await Return.findById(req.params.id);

    if (!returnDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Return not found" });
    }

    if (pickupScheduled !== undefined)
      returnDoc.pickupScheduled = pickupScheduled;
    if (pickupDate) returnDoc.pickupDate = new Date(pickupDate);
    if (pickupStatus) returnDoc.pickupStatus = pickupStatus;

    await returnDoc.save();

    res.json({ success: true, return: returnDoc });
  } catch (err) {
    console.error("Error updating pickup status:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to update pickup status" });
  }
};
