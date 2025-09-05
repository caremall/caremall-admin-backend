import { Router } from "express";
import {
  getAllInventories,
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

export default inventoryRouter;
