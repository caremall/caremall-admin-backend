import express from "express";
import { createPin, deletePin, getPinById, getPins, updatePin } from "../../controllers/admin/pincode.controller.mjs";

const pincodeRouter = express.Router();

// Create a new pin
pincodeRouter.post("/", createPin);

// Get all pins
pincodeRouter.get("/", getPins);

// Get a single pin by ID
pincodeRouter.get("/:id", getPinById);

// Update a pin by ID
pincodeRouter.put("/:id", updatePin);

// Delete a pin by ID
pincodeRouter.delete("/:id", deletePin);

export default pincodeRouter;
