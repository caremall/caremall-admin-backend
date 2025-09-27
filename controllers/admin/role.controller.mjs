import Role from "../../models/Role.mjs";

// Create Role
export const createRole = async (req, res) => {
    await Role.create(req.body);
    res
      .status(201)
      .json({ success: true, message: "Role created successfully" });
};

// Get All Roles
// controllers/role.controller.mjs

export const getAllRoles = async (req, res) => {
  try {
    const { search, permission, status, page, limit } = req.query;

    const filter = {};

    // Search by name or description
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by permission
    if (permission) {
      filter.permissions = permission;
    }

    // Filter by status
    if (status && ['draft', 'published'].includes(status)) {
      filter.status = status;
    }

    // If no pagination parameters provided, return all data
    if (!page && !limit) {
      const roles = await Role.find(filter).sort({ createdAt: -1 });
      
      return res.status(200).json({
        data: roles,
        meta: {
          total: roles.length,
          page: 1,
          limit: roles.length,
          totalPages: 1,
        },
      });
    }

    // Use pagination if parameters provided
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Get total for pagination
    const total = await Role.countDocuments(filter);

    const roles = await Role.find(filter)
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    res.status(200).json({
      data: roles,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get Role by ID
export const getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ error: "Role not found" });
    res.status(200).json(role);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Role
export const updateRole = async (req, res) => {
  try {
    const role = await Role.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!role) return res.status(404).json({ error: "Role not found" });
    res
      .status(200)
      .json({ success: true, message: "Role Updated successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete Role
export const deleteRole = async (req, res) => {
  try {
    const role = await Role.findByIdAndDelete(req.params.id);
    if (!role) return res.status(404).json({ error: "Role not found" });
    res
      .status(200)
      .json({ success: true, message: "Role deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
