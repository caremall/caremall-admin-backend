import { Router } from "express";
import {
  allocateWarehouse,
  deleteOrder,
  getAllOrders,
  getOrderById,
  markOrderDelivered,
  updateOrderStatus,
} from "../../controllers/admin/orders.controller.mjs";
import { verifyToken } from "../../middlewares/verifyToken.mjs";

const router = Router();

// GET all orders with filter, search, pagination
router.get("/", getAllOrders);

// GET single order by ID
router.get("/:id", getOrderById);

// PATCH: update order status (e.g., processing, shipped, cancelled)
router.patch("/:id/status", updateOrderStatus);

// PATCH: mark order as delivered
router.patch("/:id/deliver", markOrderDelivered);

// DELETE order
router.delete("/:id", deleteOrder);

router.put("/allocate-warehouse/:id",verifyToken,allocateWarehouse)

export default router;
