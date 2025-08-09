import express from 'express';
import {
    createReturnRequest,
    getUserReturns,
    getReturnById,
    cancelReturnRequest,
} from '../../controllers/user/returns.controller.mjs';
import { verifyUserToken } from '../../middlewares/verifyToken.mjs';

const router = express.Router();

// Protected routes
router.post('/', verifyUserToken, createReturnRequest);       // POST /api/returns
router.get('/', verifyUserToken, getUserReturns);             // GET /api/returns
router.get('/:id', verifyUserToken, getReturnById);           // GET /api/returns/:id
router.delete('/:id', verifyUserToken, cancelReturnRequest);  // DELETE /api/returns/:id

export default router;
