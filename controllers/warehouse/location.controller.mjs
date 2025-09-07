import WarehouseLocation from "../../models/WarehouseLocation.mjs";

export const createWarehouseLocation = async (req, res) => {
  try {
    const { code, name, capacity } = req.body;
    const warehouse = req.user.assignedWarehouses._id;
    if (!warehouse || !code) {
      return res
        .status(400)
        .json({ message: "Warehouse and code are required." });
    }

    const location = await WarehouseLocation.create({
      warehouse,
      code,
      name,
      capacity,
    });

    res.status(201).json({ message: "Warehouse location created", location });
  } catch (err) {
    console.error("Create WarehouseLocation Error:", err);
    res.status(500).json({ message: "Failed to create warehouse location" });
  }
};

export const getWarehouseLocations = async (req, res) => {
  try {
    const { status, type } = req.query;
    const warehouse = req.user.assignedWarehouses._id;
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
    const updates = req.body;

    const location = await WarehouseLocation.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!location)
      return res.status(404).json({ message: "Warehouse location not found" });

    res.status(200).json({ message: "Warehouse location updated", location });
  } catch (err) {
    console.error("Update WarehouseLocation Error:", err);
    res.status(500).json({ message: "Failed to update warehouse location" });
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
