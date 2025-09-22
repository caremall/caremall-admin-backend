import Return from "../../models/Return.mjs";

export const getAllReturns = async (req, res) => {
  try {
    const { status, refundStatus } = req.query;
    const warehouseId = req.user.assignedWarehouses._id;

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
