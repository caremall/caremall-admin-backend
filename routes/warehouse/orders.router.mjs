import { Router } from "express";
import {
  deleteOrder,
  getAllocatedOrders,
  getAllOrders,
  getOrderById,
  markOrderDelivered,
  updateOrderStatus,
} from "../../controllers/warehouse/orders.controller.mjs";

const router = Router();

router.get("/allocated",getAllocatedOrders)
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


export default router;
