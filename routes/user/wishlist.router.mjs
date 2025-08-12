import express from 'express';
import {
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
} from '../../controllers/user/wishlist.controller.mjs';
import { verifyUserToken } from '../../middlewares/verifyToken.mjs';

const router = express.Router();

// Protect all wishlist routes
router.use(verifyUserToken);

/**
 * @route GET /wishlist
 * @desc Get the current user's wishlist
 */
router.get('/', getWishlist);

/**
 * @route POST /wishlist
 * @desc Add an item to wishlist
 * @body { productId: string, variantId?: string }
 */
router.post('/', addToWishlist);

/**
 * @route PATCH /wishlist/remove
 * @desc Remove a specific item from wishlist
 * @body { productId: string, variantId?: string }
 */
router.patch('/remove', removeFromWishlist);

/**
 * @route DELETE /wishlist/clear
 * @desc Clear all items from wishlist
 */
router.delete('/clear', clearWishlist);

export default router;
