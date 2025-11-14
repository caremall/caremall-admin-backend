import { Router } from "express";
import {
  createDamagedInventoryReport,
  createTransferRequestAdmin,
  getAllInventories,
  getDamagedInventoryReports,
  getInventoryById,
  getInventoryLogs,
  getProductReport,
  getStockReport,
  toggleFavoriteInventoryLog,
  updateInventory,
} from "../../controllers/admin/inventory.controller.mjs";
import { getTransferRequestsAdmin } from "../../controllers/warehouse/inventory.controller.mjs";
import { verifyUserToken } from "../../middlewares/verifyToken.mjs";

const router = Router();

//report
router.get("/stock-report", getStockReport);
router.get("/product-report", getProductReport);

// inventory list & logs
router.get("/", getAllInventories);
router.get("/log", getInventoryLogs);

// 🔥 Admin Transfer Requests (MUST be before :id)
router.get("/transfer",verifyUserToken, getTransferRequestsAdmin);
router.post("/transfer", createTransferRequestAdmin);

// damaged inventory report
router.get("/damaged", getDamagedInventoryReports);
router.post("/:id/damaged", createDamagedInventoryReport);

// update inventory
router.put("/", updateInventory);

// 🔥 Dynamic routes come last
router.put("/:id/favourite", toggleFavoriteInventoryLog);
router.get("/:id", getInventoryById);


export default router;
