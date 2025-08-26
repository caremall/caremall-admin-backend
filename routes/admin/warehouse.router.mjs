import { Router } from "express";
import {
  createWarehouse,
  getWarehouses,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse,
  deleteWarehouses,
} from "../../controllers/admin/warehouse.controller.mjs";

const adminWarehouseRouter = Router();

adminWarehouseRouter.post("/", createWarehouse);
adminWarehouseRouter.get("/", getWarehouses);
adminWarehouseRouter.get("/:id", getWarehouseById);
adminWarehouseRouter.put("/:id", updateWarehouse);
adminWarehouseRouter.delete("/:id", deleteWarehouse);
adminWarehouseRouter.put("/delete-multiple",deleteWarehouses)

export default adminWarehouseRouter;
