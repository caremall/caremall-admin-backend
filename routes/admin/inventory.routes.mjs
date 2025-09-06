import { Router } from "express";
import {
    createDamagedInventoryReport,
  getAllInventories,
  getDamagedInventoryReports,
  getInventoryById,
  getInventoryLogs,
  toggleFavoriteInventoryLog,
  updateInventory,
} from "../../controllers/warehouse/inventory.controller.mjs";

const router = Router();

router.put("/", updateInventory);
router.get("/", getAllInventories);
router.get("/:id", getInventoryById);
router.get("/log", getInventoryLogs);
router.put("/:id/favourite", toggleFavoriteInventoryLog);

//damaged inventory report
router.post("/:id/damaged", createDamagedInventoryReport);
router.get("/damaged", getDamagedInventoryReports);

export default router;
