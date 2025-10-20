import express from 'express';
import {
    createReturnRequest,
    getUserReturns,
    getReturnById,
    cancelReturnRequest,
    getReturnsByProduct,
    getReturnByOrderAndProduct,
} from '../../controllers/user/returns.controller.mjs';
import { verifyUserToken } from '../../middlewares/verifyToken.mjs';
import { catchAsyncErrors } from '../../utils/catchAsyncErrors.mjs';

const router = express.Router();

// Protected routes
router.post('/', verifyUserToken, catchAsyncErrors(createReturnRequest));       // POST /api/returns
router.get('/', verifyUserToken, getUserReturns);             // GET /api/returns
router.get('/:id', verifyUserToken, getReturnById);           // GET /api/returns/:id
router.get("/product/:productId", verifyUserToken, getReturnsByProduct);
router.get("/order/:orderId/product/:productId", verifyUserToken, getReturnByOrderAndProduct);
router.delete('/:id', verifyUserToken, cancelReturnRequest);  // DELETE /api/returns/:id

export default router;
