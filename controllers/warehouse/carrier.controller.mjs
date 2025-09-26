import Carrier from "../../models/Carrier.mjs";
import bcrypt from "bcryptjs";
import { uploadBase64Image } from "../../utils/uploadImage.mjs";

// Create a new carrier
export const createCarrier = async (req, res) => {
  try {
    const { name, location, phoneNumber, image, email } = req.body;

    const warehouse = req.user.assignedWarehouses._id;

    if (!name || !phoneNumber || !warehouse || !email) {
      return res.status(400).json({
        message: "Name, Phone Number, email and Warehouse are required",
      });
    }

    let imageUrl = "";
    if (image) {
      imageUrl = await uploadBase64Image(image, "carrier-images/");
    }

    const newCarrier = new Carrier({
      name,
      location,
      phoneNumber,
      warehouse,
      email,
      image: imageUrl,
    });

    await newCarrier.save();

    res.status(201).json({ success: true, carrier: newCarrier });
  } catch (err) {
    console.error("Create Carrier Error:", err);
    res.status(500).json({ message: "Failed to create carrier" });
  }
};

// Get list of all carriers (optionally filtered by warehouse)
export const getAllCarriers = async (req, res) => {
  try {
    const warehouseId = req.user.assignedWarehouses._id;
    const filter = {};

    if (warehouseId) {
      filter.warehouse = warehouseId;
    }

    const carriers = await Carrier.find(filter)
      .populate("warehouse", "name type location")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: carriers });
  } catch (err) {
    console.error("Get All Carriers Error:", err);
    res.status(500).json({ message: "Failed to fetch darriers" });
  }
};

// Get a single carrier by ID
export const getCarrierById = async (req, res) => {
  try {
    const carrier = await Carrier.findById(req.params.id)
      .populate("warehouse", "name type location")
      .lean();

    if (!carrier) return res.status(404).json({ message: "Carrier not found" });

    res.status(200).json({ success: true, carrier });
  } catch (err) {
    console.error("Get Carrier By ID Error:", err);
    res.status(500).json({ message: "Failed to fetch carrier" });
  }
};

// Update a carrier by ID
export const updateCarrier = async (req, res) => {
  try {
    const dataToUpdate = { ...req.body };

    // Handle image update carefully
    if (dataToUpdate.image) {
      const image = dataToUpdate.image;

      if (typeof image === "string" && image.startsWith("data:image/")) {
        // It's a new base64 image to upload
        const uploadedImageUrl = await uploadBase64Image(
          image,
          "carrier-images/"
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

    const updatedCarrier = await Carrier.findByIdAndUpdate(
      req.params.id,
      dataToUpdate,
      { new: true, runValidators: true }
    );

    if (!updatedCarrier)
      return res.status(404).json({ message: "Carrier not found" });

    res.status(200).json({ success: true, carrier: updatedCarrier });
  } catch (err) {
    console.error("Update Carrier Error:", err);
    res.status(500).json({ message: "Failed to update carrier" });
  }
};

// Delete a carrier by ID
export const deleteCarrier = async (req, res) => {
  try {
    const deleted = await Carrier.findByIdAndDelete(req.params.id);

    if (!deleted) return res.status(404).json({ message: "Carrier not found" });

    res
      .status(200)
      .json({ success: true, message: "Carrier deleted successfully" });
  } catch (err) {
    console.error("Delete Carrier Error:", err);
    res.status(500).json({ message: "Failed to delete carrier" });
  }
};
