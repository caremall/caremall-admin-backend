import express from "express";
import {
  createWarehouseUser,
  getAllWarehouseUsers,
  getWarehouseUserById,
  updateWarehouseUser,
  deleteWarehouseUser
} from "../../controllers/warehouse/warehouseUser.controller.mjs";

const router = express.Router();

router.post("/", createWarehouseUser);

router.get("/", getAllWarehouseUsers);


router.get("/:id", getWarehouseUserById);


router.put("/:id", updateWarehouseUser);


router.delete("/:id", deleteWarehouseUser);

export default router;