import Driver from "../../models/Driver.mjs";
import bcrypt from "bcryptjs";
import { uploadBase64Image } from "../../utils/uploadImage.mjs";


export const createDriver = async (req, res) => {
  try {
    const { name, location, vehicleNumber, image, notes } = req.body;

    const warehouse =
      req.user.assignedWarehouses?._id ||
      (Array.isArray(req.user.assignedWarehouses) &&
        req.user.assignedWarehouses.length > 0 &&
        req.user.assignedWarehouses[0]._id);

    console.log("Creating driver for warehouse:", warehouse);

    if (!name || !vehicleNumber || !warehouse) {
      return res
        .status(400)
        .json({ message: "Name, Vehicle Number, and Warehouse are required" });
    }

    // Normalize input for comparison
    const normalizedInput = vehicleNumber
      .toUpperCase()
      .replace(/\s+/g, "");

    // Find any driver in the same warehouse with matching normalized vehicle number
    const existingDriver = await Driver.findOne({
      warehouse,
      // Match vehicleNumber where removing spaces + uppercase = normalizedInput
      vehicleNumber: { $regex: `^${normalizedInput}$`, $options: "i" }
    });

    if (existingDriver) {
      return res.status(400).json({
        message: "Vehicle Number already exists in this warehouse",
      });
    }

    let imageUrl = "";
    if (image) {
      imageUrl = await uploadBase64Image(image, "driver-images/");
    }

    const newDriver = new Driver({
      name,
      location,
      vehicleNumber: vehicleNumber.trim(), // Save original
      warehouse,
      notes,
      image: imageUrl,
    });

    await newDriver.save();

    res.status(201).json({ success: true, driver: newDriver });
  } catch (err) {
    console.error("Create Driver Error:", err);
    res.status(500).json({ message: "Failed to create driver" });
  }
};

// Get list of all drivers (optionally filtered by warehouse)
export const getAllDrivers = async (req, res) => {
  try {
    const warehouseId =
      req.user.assignedWarehouses?._id ||
      (Array.isArray(req.user.assignedWarehouses) &&
        req.user.assignedWarehouses.length > 0 &&
        req.user.assignedWarehouses[0]._id);
    const filter = {};

    if (warehouseId) {
      filter.warehouse = warehouseId;
    }

    const drivers = await Driver.find(filter)
      .populate("warehouse", "name type location")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: drivers });
  } catch (err) {
    console.error("Get All Drivers Error:", err);
    res.status(500).json({ message: "Failed to fetch drivers" });
  }
};

// Get a single driver by ID
export const getDriverById = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id)
      .populate("warehouse", "name type location")
      .lean();

    if (!driver) return res.status(404).json({ message: "Driver not found" });

    res.status(200).json({ success: true, driver });
  } catch (err) {
    console.error("Get Driver By ID Error:", err);
    res.status(500).json({ message: "Failed to fetch driver" });
  }
};

// Update a driver by ID
export const updateDriver = async (req, res) => {
  try {
    const dataToUpdate = { ...req.body };

    // Handle image update carefully
    if (dataToUpdate.image) {
      const image = dataToUpdate.image;

      if (typeof image === "string" && image.startsWith("data:image/")) {
        // It's a new base64 image to upload
        const uploadedImageUrl = await uploadBase64Image(
          image,
          "driver-images/"
        );
        dataToUpdate.image = uploadedImageUrl;
      } else if (typeof image === "string" && image.startsWith("http")) {
        // Existing image URL, keep as is, remove from update to avoid overwrite
        delete dataToUpdate.image;
      } else {
        // Invalid format: remove field or handle error
        delete dataToUpdate.image;
      }
    }

    const updatedDriver = await Driver.findByIdAndUpdate(
      req.params.id,
      dataToUpdate,
      { new: true, runValidators: true }
    );

    if (!updatedDriver)
      return res.status(404).json({ message: "Driver not found" });

    res.status(200).json({ success: true, driver: updatedDriver });
  } catch (err) {
    console.error("Update Driver Error:", err);
    res.status(500).json({ message: "Failed to update driver" });
  }
};



// Delete a driver by ID
export const deleteDriver = async (req, res) => {
  try {
    const deleted = await Driver.findByIdAndDelete(req.params.id);

    if (!deleted) return res.status(404).json({ message: "Driver not found" });

    res
      .status(200)
      .json({ success: true, message: "Driver deleted successfully" });
  } catch (err) {
    console.error("Delete Driver Error:", err);
    res.status(500).json({ message: "Failed to delete driver" });
  }
};
