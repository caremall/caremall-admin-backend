import { Router } from 'express'

import {
    createRole,
    getAllRoles,
    getRoleById,
    updateRole,
    deleteRole,
} from '../controllers/role.controller.mjs'

const router = Router()

router.post('/', createRole)
router.get('/', getAllRoles)
router.get('/:id', getRoleById)
router.put('/:id', updateRole)
router.delete('/:id', deleteRole)

export default router
