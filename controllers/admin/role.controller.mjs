import Role from "../../models/Role.mjs";

// Create Role
export const createRole = async (req, res) => {
    try {
        const { name, permissions, description, status } = req.body;

        // Validate required fields
        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Role name is required"
            });
        }

        // Check if role already exists
        const existingRole = await Role.findOne({ name });
        if (existingRole) {
            return res.status(409).json({
                success: false,
                message: "Role with this name already exists"
            });
        }

        // Validate status enum
        if (status && !['draft', 'published'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be either 'draft' or 'published'"
            });
        }

        // Create role with default permissions structure
        const roleData = {
            name: name.trim(),
            description: description?.trim() || '',
            status: status || 'draft',
            permissions: {
                dashboard: {
                    view: permissions?.dashboard?.view || false
                },
                warehouseManager: {
                    create: permissions?.warehouseManager?.create || false,
                    view: permissions?.warehouseManager?.view || false,
                    edit: permissions?.warehouseManager?.edit || false,
                    delete: permissions?.warehouseManager?.delete || false
                },
                warehouse: {
                    create: permissions?.warehouse?.create || false,
                    view: permissions?.warehouse?.view || false,
                    edit: permissions?.warehouse?.edit || false,
                    delete: permissions?.warehouse?.delete || false
                },
                location: {
                    create: permissions?.location?.create || false,
                    view: permissions?.location?.view || false,
                    edit: permissions?.location?.edit || false,
                    delete: permissions?.location?.delete || false
                },
                orders: {
                    view: permissions?.orders?.view || false,
                    update: permissions?.orders?.update || false
                },
                inventory: {
                    overview: permissions?.inventory?.overview || false,
                    history: permissions?.inventory?.history || false,
                    lowStockAlerts: permissions?.inventory?.lowStockAlerts || false,
                    damagedInventory: permissions?.inventory?.damagedInventory || false,
                    stockTransaction: permissions?.inventory?.stockTransaction || false,
                    stockAdjustment: permissions?.inventory?.stockAdjustment || false
                },
                products: {
                    create: permissions?.products?.create || false,
                    view: permissions?.products?.view || false,
                    edit: permissions?.products?.edit || false,
                    delete: permissions?.products?.delete || false
                },
                userManagement: {
                    block: permissions?.userManagement?.block || false,
                    view: permissions?.userManagement?.view || false
                },
                websiteManagement: {
                    manage: permissions?.websiteManagement?.manage || false
                },
                admin: {
                    create: permissions?.admin?.create || false,
                    view: permissions?.admin?.view || false,
                    edit: permissions?.admin?.edit || false,
                    delete: permissions?.admin?.delete || false,
                },
                roles: {
                    create: permissions?.roles?.create || false,
                    view: permissions?.roles?.view || false,
                    edit: permissions?.roles?.edit || false,
                    delete: permissions?.roles?.delete || false,
                },
            }
        };

        const role = await Role.create(roleData);

        res.status(201).json({
            success: true,
            message: "Role created successfully",
            data: {
                id: role._id,
                name: role.name,
                status: role.status,
                description: role.description
            }
        });

    } catch (error) {
        console.error("Error creating role:", error);
        
        // Mongoose validation error
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors
            });
        }

        // Mongoose duplicate key error
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Role with this name already exists"
            });
        }

       
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
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



export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, permissions, description, status } = req.body;

    // Validate role ID
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Role ID is required"
      });
    }

    // Check if role exists
    const existingRole = await Role.findById(id);
    if (!existingRole) {
      return res.status(404).json({
        success: false,
        message: "Role not found"
      });
    }

    // If name is being updated, check for duplicates
    if (name && name !== existingRole.name) {
      const duplicateRole = await Role.findOne({ name: name.trim() });
      if (duplicateRole) {
        return res.status(409).json({
          success: false,
          message: "Role with this name already exists"
        });
      }
    }

    // Validate status enum
    if (status && !['draft', 'published'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'draft' or 'published'"
      });
    }

    // Prepare update data - use the incoming permissions directly
    const updateData = {
      ...(name && { name: name.trim() }),
      ...(description && { description: description.trim() }),
      ...(status && { status }),
    };

    // If permissions are provided, use them directly
    if (permissions) {
      updateData.permissions = permissions;
    }

    const role = await Role.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    // Return the complete role data including permissions
    res.status(200).json({
      success: true,
      message: "Role updated successfully",
      data: role // Return the entire role document
    });

  } catch (error) {
    console.error("Error updating role:", error);
    
    // Mongoose validation error
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors
      });
    }

    // Mongoose duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Role with this name already exists"
      });
    }

    // Invalid ID format
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: "Invalid role ID format"
      });
    }

    res.status(500).json({
  success: false,
  message: "Internal server error",
  errorMessage: error.message,  // Add this line temporarily
  stack: error.stack             // Add this line temporarily
});
  }
};

export const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate role ID
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Role ID is required"
      });
    }

    const role = await Role.findById(id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found"
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: role._id,
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        status: role.status,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt
      }
    });

  } catch (error) {
    console.error("Error fetching role:", error);
    
    // Invalid ID format
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: "Invalid role ID format"
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
