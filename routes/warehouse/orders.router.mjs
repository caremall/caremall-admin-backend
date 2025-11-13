import { Router } from "express";
import {
  addPackingDetails,
  assignOrderToDeliveryBoy,
  deleteOrder,
  getAllocatedOrders,
  getAllOrders,
  getOrderById,
  markOrderCancelled,
  markOrderDelivered,
  markOrderDispatched,
  updateOrderStatus,
  // updatePackingDetails,
  updatePickedQuantities,
  getOutOfStockOrders,
  getOutOfStockOrderById,
} from "../../controllers/warehouse/orders.controller.mjs";

const router = Router();

//pick and pack

router.post("/:id/pick", updatePickedQuantities)
// router.put("/:orderId/pack/:packingId",updatePackingDetails)

router.post("/:id/pack", addPackingDetails)
router.post("/:id/dispatch", markOrderDispatched)
router.patch("/:id/cancel", markOrderCancelled)
router.put("/:id/assign-deliveryboy", assignOrderToDeliveryBoy);

router.get("/outstock",getOutOfStockOrders)

router.get("/outstock/:id", getOutOfStockOrderById);

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
