
import mongoose from 'mongoose';
import WarehouseUser from '../../models/warehouseUser.mjs';


const getWarehouseId = (user) => {
  const assigned = user.assignedWarehouses;
  return Array.isArray(assigned) ? assigned?.[0]?._id : assigned?._id;
};

/* ------------------- CREATE ------------------- */
export const createWarehouseUser = async (req, res) => {
  try {
    const { name, description, email, phone, role } = req.body;
    const warehouse = getWarehouseId(req.user);

    if (!warehouse) return res.status(403).json({ message: "User has no assigned warehouse" });
    if (!name || !description || !email || !phone) {
      return res.status(400).json({ message: "Name, description, email and phone are required" });
    }

    const normalizedPhone = Number(phone);
    if (isNaN(normalizedPhone)) return res.status(400).json({ message: "Phone must be a number" });

    const newUser = new WarehouseUser({
      warehouse,
      name: name.trim(),
      description: description.trim(),
      email: email.toLowerCase().trim(),
      phone: normalizedPhone,
      role: ['Picker', 'Packer', 'Other'].includes(role) ? role : 'Other',
    });

    const saved = await newUser.save();           // <-- index will throw if duplicate
    return res.status(201).json({
      message: 'Warehouse user created successfully',
      user: saved,
    });
  } catch (error) {
    // Friendly message from the post-save hook
    return res.status(400).json({ message: error.message });
  }
};

/* ------------------- LIST ------------------- */
export const getAllWarehouseUsers = async (req, res) => {
  try {
    const warehouse = getWarehouseId(req.user);
    if (!warehouse) return res.status(403).json({ message: "User has no assigned warehouse" });

    const users = await WarehouseUser.find({ warehouse })
      .select('-__v')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: 'Warehouse users retrieved successfully',
      count: users.length,
      users,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/* ------------------- GET ONE ------------------- */
export const getWarehouseUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const warehouse = getWarehouseId(req.user);
    if (!warehouse) return res.status(403).json({ message: "User has no assigned warehouse" });
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid user ID" });

    const user = await WarehouseUser.findOne({ _id: id, warehouse }).select('-__v');
    if (!user) return res.status(404).json({ message: "Warehouse user not found" });

    return res.status(200).json({ message: 'Warehouse user retrieved successfully', user });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/* ------------------- UPDATE ------------------- */
export const updateWarehouseUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, email, phone, role } = req.body;
    const warehouse = getWarehouseId(req.user);

    if (!warehouse) return res.status(403).json({ message: "User has no assigned warehouse" });
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid user ID" });

    const updates = {};
    if (name) updates.name = name.trim();
    if (description) updates.description = description.trim();
    if (email) updates.email = email.toLowerCase().trim();
    if (phone) {
      const n = Number(phone);
      if (isNaN(n)) return res.status(400).json({ message: "Phone must be a number" });
      updates.phone = n;
    }
    if (role && ['Picker', 'Packer', 'Other'].includes(role)) updates.role = role;

    const updated = await WarehouseUser.findOneAndUpdate(
      { _id: id, warehouse },
      updates,
      { new: true, runValidators: true }
    ).select('-__v');

    if (!updated) return res.status(404).json({ message: "Warehouse user not found" });

    return res.status(200).json({ message: 'Warehouse user updated successfully', user: updated });
  } catch (error) {
    // Duplicate key → friendly message from post hook
    return res.status(400).json({ message: error.message });
  }
};

/* ------------------- DELETE ------------------- */
export const deleteWarehouseUser = async (req, res) => {
  try {
    const { id } = req.params;
    const warehouse = getWarehouseId(req.user);
    if (!warehouse) return res.status(403).json({ message: "User has no assigned warehouse" });
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid user ID" });

    const deleted = await WarehouseUser.findOneAndDelete({ _id: id, warehouse });
    if (!deleted) return res.status(404).json({ message: "Warehouse user not found" });

    return res.status(200).json({ message: 'Warehouse user deleted successfully', user: deleted });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};