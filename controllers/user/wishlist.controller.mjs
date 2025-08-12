import Wishlist from '../../models/Wishlist.mjs';
import Product from '../../models/Product.mjs';
import Variant from '../../models/Variant.mjs';

/**
 * @desc Get user's wishlist
 */
export const getWishlist = async (req, res) => {
    try {
        const userId = req.user._id;

        const wishlist = await Wishlist.findOne({ user: userId })
            .populate('items.product', 'productName productImages sellingPrice urlSlug mrpPrice defaultVariant hasVariant')
            .populate('items.variant');

        if (!wishlist) return res.status(200).json({ items: [] });

        res.status(200).json(wishlist);
    } catch (error) {
        console.error('Get wishlist error:', error);
        res.status(500).json({ message: 'Failed to fetch wishlist' });
    }
};

/**
 * @desc Add an item to wishlist
 */
export const addToWishlist = async (req, res) => {
    try {
        const userId = req.user._id;
        const { productId, variantId = null } = req.body;

        if (!productId) return res.status(400).json({ message: 'Product is required' });

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        if (variantId) {
            const variant = await Variant.findById(variantId);
            if (!variant) return res.status(404).json({ message: 'Variant not found' });
        }

        let wishlist = await Wishlist.findOne({ user: userId });

        if (!wishlist) {
            wishlist = await Wishlist.create({
                user: userId,
                items: [{ product: productId, variant: variantId }],
            });
        } else {
            const exists = wishlist.items.find(
                item =>
                    item.product.toString() === productId &&
                    ((item.variant && item.variant.toString()) || '') === (variantId || '')
            );

            if (exists) {
                return res.status(409).json({ message: 'Item already in wishlist' });
            }

            wishlist.items.push({ product: productId, variant: variantId });
            await wishlist.save();
        }

        res.status(200).json({ message: 'Item added to wishlist', wishlist });
    } catch (error) {
        console.error('Add to wishlist error:', error);
        res.status(500).json({ message: 'Failed to add item to wishlist' });
    }
};

/**
 * @desc Remove an item from wishlist
 */
export const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.user._id;
        const { productId, variantId = null } = req.body;

        const wishlist = await Wishlist.findOne({ user: userId });
        if (!wishlist) return res.status(404).json({ message: 'Wishlist not found' });

        wishlist.items = wishlist.items.filter(
            item =>
                !(
                    item.product.toString() === productId &&
                    ((item.variant && item.variant.toString()) || '') === (variantId || '')
                )
        );

        await wishlist.save();

        res.status(200).json({ message: 'Item removed from wishlist', wishlist });
    } catch (error) {
        console.error('Remove from wishlist error:', error);
        res.status(500).json({ message: 'Failed to remove item from wishlist' });
    }
};

/**
 * @desc Clear all items from wishlist
 */
export const clearWishlist = async (req, res) => {
    try {
        const userId = req.user._id;

        await Wishlist.findOneAndUpdate({ user: userId }, { items: [] });

        res.status(200).json({ message: 'Wishlist cleared' });
    } catch (error) {
        console.error('Clear wishlist error:', error);
        res.status(500).json({ message: 'Failed to clear wishlist' });
    }
};
