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

const inventoryRouter = Router();

inventoryRouter.put("/", updateInventory);
inventoryRouter.get("/", getAllInventories);
inventoryRouter.get("/:id", getInventoryById);
inventoryRouter.get("/log", getInventoryLogs);
inventoryRouter.put("/:id/favourite", toggleFavoriteInventoryLog);

//damaged inventory report
inventoryRouter.post("/:id/damaged", createDamagedInventoryReport);
inventoryRouter.get("/damaged", getDamagedInventoryReports);

export default inventoryRouter;
