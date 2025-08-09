import express from 'express';
import {
    addAddress,
    getUserAddresses,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
} from '../../controllers/user/addresses.controller.mjs';
import { verifyUserToken } from '../../middlewares/verifyToken.mjs';
import { catchAsyncErrors } from '../../utils/catchAsyncErrors.mjs';

const router = express.Router();

// All routes require authentication
router.use(verifyUserToken);

/**
 * @route POST /addresses
 * @desc Add a new address
 */
router.post('/', catchAsyncErrors(addAddress));

/**
 * @route GET /addresses
 * @desc Get all addresses for the logged-in user
 */
router.get('/', getUserAddresses);

/**
 * @route PUT /addresses/:id
 * @desc Update an address by ID
 */
router.put('/:id', catchAsyncErrors(updateAddress));

/**
 * @route DELETE /addresses/:id
 * @desc Delete an address by ID
 */
router.delete('/:id', deleteAddress);

/**
 * @route PATCH /addresses/:id/default
 * @desc Set an address as default
 */
router.patch('/:id/default', setDefaultAddress);



export default router;
