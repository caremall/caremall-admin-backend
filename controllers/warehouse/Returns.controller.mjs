import Return from "../../models/Return.mjs";

export const getAllReturns = async (req, res) => {
  try {
    const { status, refundStatus } = req.query;
    const warehouseId = req.user.assignedWarehouses[0]._id;
    console.log("Warehouse ID:", warehouseId);

    const query = {};
    if (status) query.status = status;
    if (refundStatus) query.refundStatus = refundStatus;

    // Find returns, populate order only if allocatedWarehouse matches warehouseId
    const returns = await Return.find(query)
      .populate("user", "name email")
      .populate({
        path: "order",
        match: { allocatedWarehouse: warehouseId },
        select: "orderStatus createdAt allocatedWarehouse",
      })
      .populate("item.product", "productName")
      .populate("item.variant", "variantAttributes")
      .sort({ createdAt: -1 });

    // Filter out returns for which order does not belong to warehouseId
    const filteredReturns = returns.filter((r) => r.order !== null);

    res.json({
      data: filteredReturns,
    });
  } catch (err) {
    console.error("Error fetching returns:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch returns",
    });
  }
};



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