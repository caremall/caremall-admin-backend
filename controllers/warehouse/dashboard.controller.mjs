import Order from "../../models/Order.mjs";
import { cancelOrder } from "../user/orders.controller.mjs";



export const getDashboardStats = async (req, res) => {
  try {
    // 1. All possible order statuses (must match DB enum)
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

    // -----------------------------------------------------------------
    // 2. Build an **array** of warehouse ObjectIds the user can see
    // -----------------------------------------------------------------
    const assigned = req.user.assignedWarehouses || []; // safety
    const warehouseIds = assigned.map((wh) => wh._id).filter(Boolean);

    console.log("User assigned warehouses:", assigned);
    console.log("Warehouse IDs for query:", warehouseIds);

    // -----------------------------------------------------------------
    // 3. Base query – filter by allocatedWarehouse if any
    // -----------------------------------------------------------------
    const query = {};
    if (warehouseIds.length > 0) {
      query.allocatedWarehouse = { $in: warehouseIds };
    }

    console.log("Final Mongoose query:", JSON.stringify(query, null, 2));

    // -----------------------------------------------------------------
    // 4. Aggregation – count per orderStatus
    // -----------------------------------------------------------------
    const groupResults = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$orderStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    console.log(
      "Aggregation results:",
      JSON.stringify(groupResults, null, 2)
    );

    // -----------------------------------------------------------------
    // 5. Normalise counts (default = 0)
    // -----------------------------------------------------------------
    const counts = {};
    statuses.forEach((s) => (counts[s] = 0));
    groupResults.forEach((r) => {
      counts[r._id] = r.count;
    });

    // -----------------------------------------------------------------
    // 6. Total orders (same filter)
    // -----------------------------------------------------------------
    const totalOrdersCount = await Order.countDocuments(query);

    // -----------------------------------------------------------------
    // 7. Response – map DB status → UI label
    // -----------------------------------------------------------------
    res.json({
      totalOrders: totalOrdersCount,

      // pendingOrders: counts.pending,
      // processingOrders: counts.processing,

      // UI usually calls this “picking” while DB stores “picked”
      // pickingOrders: counts.picked,

      // packedOrders: counts.packed,
      dispatchedOrders: counts.dispatched,
      // shippedOrders: counts.shipped,
      deliveredOrders: counts.delivered,
      cancelOrders: counts.cancelled,
    });
  } catch (err) {
    console.error("Error in getDashboardStats:", err);
    res
      .status(500)
      .json({ error: "Failed to get dashboard stats", msg: err.message });
  }
};