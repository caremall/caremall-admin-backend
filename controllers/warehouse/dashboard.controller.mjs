import Order from "../../models/Order.mjs";

export const getDashboardStats = async (req, res) => {
  try {
    const statuses = [
      "pending",
      "processing",
      "picked",
      "packed",
      "dispatched",
      "shipped",
      "delivered",
      "cancelled",
    ];

    const warehouseId = req.user.assignedWarehouses._id;

    const query = {};
    if (warehouseId) query.allocatedWarehouse = warehouseId;

    const groupResults = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$orderStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    const counts = {};
    statuses.forEach((status) => {
      counts[status] = 0;
    });
    groupResults.forEach((result) => {
      counts[result._id] = result.count;
    });

    res.json({
      totalOrders: await Order.countDocuments(),
      pendingOrders: counts.pending,
      pickingOrders: counts.picked,
      packedOrders: counts.packed,
      dispatchOrders: counts.dispatched,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to get dashboard stats", msg: err.message });
  }
};
