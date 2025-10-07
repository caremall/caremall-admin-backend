import { Router } from "express";
import {
  assignDriverToTransferRequest,
    createDamagedInventoryReport,
  createInboundJob,
  createTransferRequest,
  decrementInventory,
  deleteDamagedInventoryReport,
  getAllInventories,
  getDamagedInventoryReports,
  getDamagedInventoryReportsById,
  getInboundJobById,
  getInboundJobs,
  getInventoryById,
  getInventoryLogs,
  getLowStockProducts,
  getTransferRequests,
  getUpdatedInventories,
  incrementInventory,
  toggleFavoriteInventoryLog,
  updateDamagedInventoryReport,
  updateInventory,
  updateTransferRequestStatus,
} from "../../controllers/warehouse/inventory.controller.mjs";

const inventoryRouter = Router();
//inbound
inventoryRouter.post("/inbound",createInboundJob )
inventoryRouter.get("/inbound",getInboundJobs )
inventoryRouter.get("/inbound/:id",getInboundJobById )
//transfer
inventoryRouter.post("/transfer/create",createTransferRequest)
inventoryRouter.put("/transfer/:id",updateTransferRequestStatus)
inventoryRouter.get("/transfer",getTransferRequests)
inventoryRouter.post("/transfer/assign-driver/:id",assignDriverToTransferRequest)

//damaged inventory report
inventoryRouter.post("/damaged", createDamagedInventoryReport);
inventoryRouter.put("/damaged/:id", updateDamagedInventoryReport);
inventoryRouter.get("/damaged", getDamagedInventoryReports);
inventoryRouter.get("/damaged/:id", getDamagedInventoryReportsById);
inventoryRouter.delete("/damaged/:id", deleteDamagedInventoryReport);

inventoryRouter.put("/increment/:id",incrementInventory)
inventoryRouter.put("/decrement/:id",decrementInventory)
inventoryRouter.put("/", updateInventory);
inventoryRouter.get("/updated-inventory", getUpdatedInventories);
inventoryRouter.get("/", getAllInventories);
inventoryRouter.get("/log", getInventoryLogs);
inventoryRouter.get("/low-stock", getLowStockProducts);
inventoryRouter.get("/:id", getInventoryById);
inventoryRouter.put("/:id/favourite", toggleFavoriteInventoryLog);




export default inventoryRouter;
