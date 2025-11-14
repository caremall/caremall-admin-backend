import { Router } from "express";
import {
  createDamagedInventoryReport,
  getAllInventories,
  getDamagedInventoryReports,
  getInventoryById,
  getInventoryLogs,
  getProductReport,
  getStockReport,
  getTransferRequests,
  toggleFavoriteInventoryLog,
  updateInventory,
} from "../../controllers/admin/inventory.controller.mjs";

const router = Router();

//report
router.get("/stock-report", getStockReport);
router.get("/product-report", getProductReport);

router.put("/", updateInventory);
router.get("/", getAllInventories);
router.get("/log", getInventoryLogs);
router.get("/:id", getInventoryById);
router.put("/:id/favourite", toggleFavoriteInventoryLog);
router.get("/transfer",getTransferRequests)

//damaged inventory report
router.post("/:id/damaged", createDamagedInventoryReport);
router.get("/damaged", getDamagedInventoryReports);

export default router;
