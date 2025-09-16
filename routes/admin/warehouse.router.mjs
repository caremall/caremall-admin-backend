import { Router } from "express";
import {
  createWarehouse,
  getWarehouses,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse,
  deleteWarehouses,
  getOrdersByWarehouseId 
} from "../../controllers/admin/warehouse.controller.mjs";

const adminWarehouseRouter = Router();

adminWarehouseRouter.post("/", createWarehouse);
adminWarehouseRouter.get("/", getWarehouses);
adminWarehouseRouter.get("/:id", getWarehouseById);
adminWarehouseRouter.put("/delete-multiple",deleteWarehouses)
adminWarehouseRouter.put("/:id", updateWarehouse);
adminWarehouseRouter.delete("/:id", deleteWarehouse);
adminWarehouseRouter.get("/:warehouseId/orders", getOrdersByWarehouseId);

export default adminWarehouseRouter;
