import Order from "../../models/Order.mjs";

export const getDashboardStats = async (req, res) => {
  try {
    const statuses = [
      "pending", "processing", "picked", "packed", 
      "dispatched", "shipped", "delivered", "cancelled",
    ];
   

    console.log("User assigned warehouses:", req.user.assignedWarehouses);

    // Get all warehouse IDs from the assigned warehouses array
    const warehouseIds = req.user.assignedWarehouses?.map(wh => wh._id) || [];
    console.log("Warehouse IDs:", warehouseIds);

    const query = {};
    if (warehouseIds.length > 0) {
      query.allocatedWarehouse = { $in: warehouseIds };
    }

    console.log("Final query:", JSON.stringify(query, null, 2));

    const groupResults = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$orderStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    console.log("Aggregation results:", JSON.stringify(groupResults, null, 2));

    const counts = {};
    statuses.forEach((status) => {
      counts[status] = 0;
    });
    groupResults.forEach((result) => {
      counts[result._id] = result.count;
    });

    const totalOrdersCount = await Order.countDocuments(query);

    res.json({
      totalOrders: totalOrdersCount,
      pendingOrders: counts.pending,
      pickingOrders: counts.picked,
      packedOrders: counts.packed,
      dispatchOrders: counts.dispatched,
    });
  } catch (err) {
    console.error("Error in getDashboardStats:", err);
    res.status(500).json({ error: "Failed to get dashboard stats", msg: err.message });
  }
};