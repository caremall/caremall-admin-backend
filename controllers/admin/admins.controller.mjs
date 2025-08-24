import { encrypt } from "../../utils/encryptPassword.mjs";
import Admin from "../../models/Admin.mjs";
import bcrypt from "bcryptjs";
import Role from "../../models/Role.mjs"; // Import Role model

export const getAllAdmins = async (req, res) => {
  try {
    const {
      status,
      role,
      search,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const query = {};

    if (status && status !== "all") {
      query.status = status;
    }

    if (role && role !== "all") {
      const roleDoc = await Role.findOne({ name: role.trim() });
      if (!roleDoc) {
        return res.status(400).json({ message: `Role "${role}" not found.` });
      }
      query.role = roleDoc._id;
    }

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { fullName: regex },
        { email: regex },
        { mobileNumber: regex },
      ];
    }

    const total = await Admin.countDocuments(query);

    // No pagination - fetch all matching admins
    const admins = await Admin.find(query)
      .populate("role")
      .populate("assignedWarehouses")
      .sort({ [sortBy]: order === "asc" ? 1 : -1 });

    res.status(200).json({
      data: admins,
      meta: {
        total,
        perPage: total, // Since all results are returned
        currentPage: 1, // Only one page
        totalPages: 1, // Only one page
        sortBy,
        order,
      },
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to fetch admins", error: err.message });
  }
};

export const getAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(id).populate("role").populate("assignedWarehouses");

    if (!admin) return res.status(404).json({ message: "Admin not found" });

    res.status(200).json(admin);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch admin", error: err.message });
  }
};

export const createAdmin = async (req, res) => {
    const { fullName, email, mobileNumber, role, password, notes } = req.body;

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const encryptedPassword = encrypt(password);

    const newAdmin = new Admin({
      fullName,
      email,
      mobileNumber,
      role,
      password: hashedPassword,
      encryptedPassword,
      notes,
    });

    await newAdmin.save();

    res
      .status(201)
      .json({ message: "Admin created successfully", admin: newAdmin });
};

export const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, mobileNumber, role, notes, status } = req.body;

    const admin = await Admin.findById(id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    admin.fullName = fullName || admin.fullName;
    admin.email = email || admin.email;
    admin.mobileNumber = mobileNumber || admin.mobileNumber;
    admin.role = role || admin.role;
    admin.notes = notes || admin.notes;
    admin.status = status || admin.status;

    await admin.save();

    res.status(200).json({ message: "Admin updated successfully", admin });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to update admin", error: err.message });
  }
};

export const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await Admin.findById(id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    admin.status = "removed";
    await admin.save();

    res.status(200).json({ message: "Admin removed successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to remove admin", error: err.message });
  }
};

export const changeAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["active", "inactive", "suspended", "removed"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const admin = await Admin.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).select("-password -encryptedPassword");

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.status(200).json({
      message: `Admin status updated to "${status}"`,
      admin,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update admin status" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);
    const encryptedPassword = encrypt(password);

    const admin = await Admin.findById(id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    admin.password = hashed;
    admin.encryptedPassword = encryptedPassword;
    await admin.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to reset password", error: err.message });
  }
};
