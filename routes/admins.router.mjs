import express from 'express';
import {
    getAllAdmins,
    getAdminById,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    changeAdminStatus,
} from '../controllers/admins.controller.mjs';

const router = express.Router();

// GET /api/admins?search=&status=&role=&page=&limit=&sortBy=&order=
router.get('/', getAllAdmins);

// GET /api/admins/:id
router.get('/:id', getAdminById);

// POST /api/admins
router.post('/', createAdmin);

// PUT /api/admins/:id
router.put('/:id', updateAdmin);

// PATCH /api/admins/:id/status
router.patch('/:id/status', changeAdminStatus);

// DELETE /api/admins/:id
router.delete('/:id', deleteAdmin);

export default router;
