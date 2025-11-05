import WarehouseLocation from "../../models/WarehouseLocation.mjs";

export const createWarehouseLocation = async (req, res) => {
  try {
    const { code, name, capacity } = req.body;

    // Validate required fields
    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Location code is required."
      });
    }

    // Get warehouse from user
    const warehouse =
      req.user.assignedWarehouses?._id ||
      (Array.isArray(req.user.assignedWarehouses) &&
        req.user.assignedWarehouses.length > 0 &&
        req.user.assignedWarehouses[0]._id);

    if (!warehouse) {
      return res.status(400).json({
        success: false,
        message: "User is not assigned to any warehouse."
      });
    }

    // Check if location code already exists in this warehouse
    const existingLocation = await WarehouseLocation.findOne({
      warehouse,
      code: code.trim().toUpperCase()
    });

    if (existingLocation) {
      return res.status(409).json({
        success: false,
        message: `Location code '${code}' already exists in the '${existingLocation.name}' warehouse. Please use a different code.`,
        existingLocation: {
          warehouse: existingLocation.warehouse,
          code: existingLocation.code,
          name: existingLocation.name,
          status: existingLocation.status
        }
      });
    }

    // Create new location
    const location = await WarehouseLocation.create({
      warehouse,
      code: code.trim().toUpperCase(), // Normalize code to uppercase
      name: name?.trim(),
      capacity: capacity || 0,
    });

    res.status(201).json({
      success: true,
      message: "Warehouse location created successfully",
      data: location
    });

  } catch (err) {
    console.error("Create WarehouseLocation Error:", err);

    // Handle MongoDB duplicate key error
    // if (err.code === 11000) {
    //   return res.status(409).json({
    //     success: false,
    //     message: "Location code already exists in this warehouse.",
    //     error: "DUPLICATE_CODE"
    //   });
    // }

    // Handle validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(error => error.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create warehouse location",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

export const getWarehouseLocations = async (req, res) => {
  try {
    const { status, type } = req.query;
    const warehouse =
      req.user.assignedWarehouses?._id ||
      (Array.isArray(req.user.assignedWarehouses) &&
        req.user.assignedWarehouses.length > 0 &&
        req.user.assignedWarehouses[0]._id);

    const query = {};
    if (warehouse) query.warehouse = warehouse;
    if (status) query.status = status;
    if (type) query.type = type;

    const locations = await WarehouseLocation.find(query)
      .populate("warehouse", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      data: locations,
    });
  } catch (err) {
    console.error("Get WarehouseLocations Error:", err);
    res.status(500).json({ message: "Failed to fetch warehouse locations" });
  }
};

export const getWarehouseLocationById = async (req, res) => {
  try {
    const location = await WarehouseLocation.findById(req.params.id).populate(
      "warehouse",
      "name"
    );
    if (!location)
      return res.status(404).json({ message: "Warehouse location not found" });
    res.status(200).json(location);
  } catch (err) {
    console.error("Get WarehouseLocationById Error:", err);
    res.status(500).json({ message: "Failed to fetch warehouse location" });
  }
};

export const updateWarehouseLocation = async (req, res) => {
  try {
    const { code, name, capacity } = req.body;

    const warehouse =
      req.user.assignedWarehouses?._id ||
      (Array.isArray(req.user.assignedWarehouses) &&
        req.user.assignedWarehouses.length > 0 &&
        req.user.assignedWarehouses[0]._id);

    // If user sends code, check for duplicates before updating
    if (code) {
      const existingLocation = await WarehouseLocation.findOne({
        warehouse,
        code: code.trim().toUpperCase(),
        _id: { $ne: req.params.id }, // Exclude the current location being updated
      });

      if (existingLocation) {
        return res.status(409).json({
          success: false,
          message: `Location code '${code}' already exists in '${existingLocation.name}' warehouse. Please use a different code.`,
          existingLocation: {
            warehouse: existingLocation.warehouse,
            code: existingLocation.code,
            name: existingLocation.name,
          },
        });
      }
    }

    // Proceed to update
    const updatedLocation = await WarehouseLocation.findByIdAndUpdate(
      req.params.id,
      {
        ...(code && { code: code.trim().toUpperCase() }),
        ...(name && { name: name.trim() }),
        ...(capacity !== undefined && { capacity }),
      },
      { new: true, runValidators: true }
    );

    if (!updatedLocation) {
      return res.status(404).json({ message: "Warehouse location not found" });
    }

    res.status(200).json({
      success: true,
      message: "Warehouse location updated successfully",
      data: updatedLocation,
    });
  } catch (err) {
    console.error("Update WarehouseLocation Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update warehouse location",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};


export const deleteWarehouseLocation = async (req, res) => {
  try {
    const location = await WarehouseLocation.findByIdAndDelete(req.params.id);
    if (!location)
      return res.status(404).json({ message: "Warehouse location not found" });
    res.status(200).json({ message: "Warehouse location deleted" });
  } catch (err) {
    console.error("Delete WarehouseLocation Error:", err);
    res.status(500).json({ message: "Failed to delete warehouse location" });
  }
};
