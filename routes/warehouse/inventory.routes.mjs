import { Router } from "express";
import {
  assignDriverToTransferRequest,
    createDamagedInventoryReport,
  createTransferRequest,
  getAllInventories,
  getDamagedInventoryReports,
  getInventoryById,
  getInventoryLogs,
  getTransferRequests,
  toggleFavoriteInventoryLog,
  updateInventory,
  updateTransferRequestStatus,
} from "../../controllers/warehouse/inventory.controller.mjs";

const inventoryRouter = Router();
//transfer
inventoryRouter.post("/transfer",createTransferRequest)
inventoryRouter.put("/transfer/:id",updateTransferRequestStatus)
inventoryRouter.get("/transfer",getTransferRequests)
inventoryRouter.post("/transfer/assign-driver/:id",assignDriverToTransferRequest)

inventoryRouter.put("/", updateInventory);
inventoryRouter.get("/", getAllInventories);
inventoryRouter.get("/log", getInventoryLogs);
inventoryRouter.get("/:id", getInventoryById);
inventoryRouter.put("/:id/favourite", toggleFavoriteInventoryLog);

//damaged inventory report
inventoryRouter.post("/:id/damaged", createDamagedInventoryReport);
inventoryRouter.get("/damaged", getDamagedInventoryReports);



export default inventoryRouter;
