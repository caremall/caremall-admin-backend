import Role from '../models/Role.mjs'

// Create Role
export const createRole = async (req, res) => {
    try {
        await Role.create(req.body)
        res.status(201).json({ success: true, message: 'Role created successfully' })
    } catch (err) {
        res.status(400).json({ error: err.message })
    }
}

// Get All Roles
// controllers/role.controller.mjs

export const getAllRoles = async (req, res) => {
    try {
        const { search, permission, page = 1, limit = 10 } = req.query

        const filter = {}

        // Search by name or description
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ]
        }

        // Filter by permission
        if (permission) {
            filter.permissions = permission
        }

        const skip = (parseInt(page) - 1) * parseInt(limit)

        // Get total for pagination
        const total = await Role.countDocuments(filter)

        const roles = await Role.find(filter)
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 }) // Optional: newest first

        res.status(200).json({
            data: roles,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}


// Get Role by ID
export const getRoleById = async (req, res) => {
    try {
        const role = await Role.findById(req.params.id)
        if (!role) return res.status(404).json({ error: 'Role not found' })
        res.status(200).json(role)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// Update Role
export const updateRole = async (req, res) => {
    try {
        const role = await Role.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        })
        if (!role) return res.status(404).json({ error: 'Role not found' })
        res.status(200).json({ success: true, message: 'Role Updated successfully' })
    } catch (err) {
        res.status(400).json({ error: err.message })
    }
}

// Delete Role
export const deleteRole = async (req, res) => {
    try {
        const role = await Role.findByIdAndDelete(req.params.id)
        if (!role) return res.status(404).json({ error: 'Role not found' })
        res.status(200).json({ success: true, message: 'Role deleted successfully' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}
