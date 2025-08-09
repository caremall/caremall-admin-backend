import mongoose from 'mongoose';
import Cart from '../../models/Cart.mjs';
import Product from '../../models/Product.mjs';
import Variant from '../../models/Variant.mjs';

const calculateCartTotal = (items) => {
    return items.reduce((acc, item) => acc + item.totalPrice, 0);
};

export const addToCart = async (req, res) => {
    try {
        const userId = req.user._id;
        const { productId, variantId = null, quantity } = req.body;

        if (!productId || !quantity) {
            return res.status(400).json({ message: 'Product and quantity are required.' });
        }

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: 'Invalid product ID' });
        }

        const parsedVariantId = variantId && variantId !== '' ? variantId : null;

        if (parsedVariantId && !mongoose.Types.ObjectId.isValid(parsedVariantId)) {
            return res.status(400).json({ message: 'Invalid variant ID' });
        }

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        let price = product.sellingPrice;
        if (variantId) {
            const variant = await Variant.findById(variantId);
            if (!variant) return res.status(404).json({ message: 'Variant not found' });
            price = variant.sellingPrice || price;
        }

        const itemTotal = price * quantity;

        let cart = await Cart.findOne({ user: userId });

        if (!cart) {
            cart = await Cart.create({
                user: userId,
                items: [{ product: productId, variant: variantId, quantity, priceAtCart: price, totalPrice: itemTotal }],
                cartTotal: itemTotal,
            });
        } else {
            const index = cart.items.findIndex(
                item =>
                    item.product.toString() === productId &&
                    ((item.variant && item.variant.toString()) || '') === (variantId || '')
            );

            if (index >= 0) {
                cart.items[index].quantity += quantity;
                cart.items[index].totalPrice = cart.items[index].quantity * cart.items[index].priceAtCart;
            } else {
                cart.items.push({ product: productId, variant: variantId, quantity, priceAtCart: price, totalPrice: itemTotal });
            }
            cart.cartTotal = calculateCartTotal(cart.items);
            await cart.save();
        }

        res.status(200).json({ message: 'Item added to cart', cart });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ message: 'Failed to add item to cart' });
    }
};


export const getCart = async (req, res) => {
    try {
        const userId = req.user._id;
        const cart = await Cart.findOne({ user: userId })
            .populate('items.product', 'productName productImages sellingPrice')
            .populate('items.variant');

        if (!cart) return res.status(200).json({ items: [], cartTotal: 0 });

        res.status(200).json(cart);
    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({ message: 'Failed to fetch cart' });
    }
};



export const updateCartItem = async (req, res) => {
    try {
        const userId = req.user._id;
        const { productId, variantId = null, action } = req.body;

        const cart = await Cart.findOne({ user: userId });
        if (!cart) return res.status(404).json({ message: 'Cart not found' });

        const index = cart.items.findIndex(
            item =>
                item.product.toString() === productId &&
                ((item.variant && item.variant.toString()) || '') === (variantId || '')
        );

        if (index === -1) return res.status(404).json({ message: 'Item not found in cart' });

        let item = cart.items[index];

        if (action === 'increment') {
            item.quantity += 1;
        } else if (action === 'decrement') {
            item.quantity -= 1;
            if (item.quantity < 1) {
                cart.items.splice(index, 1);
            }
        } else {
            return res.status(400).json({ message: 'Invalid action' });
        }

        if (cart.items[index]) {
            cart.items[index].totalPrice = cart.items[index].quantity * cart.items[index].priceAtCart;
        }

        cart.cartTotal = cart.items.reduce((acc, curr) => acc + curr.totalPrice, 0);
        await cart.save();

        res.status(200).json({ message: 'Cart updated', cart });
    } catch (error) {
        console.error('Update cart item error:', error);
        res.status(500).json({ message: 'Failed to update cart item' });
    }
};



export const removeCartItem = async (req, res) => {
    try {
        const userId = req.user._id;
        const { productId, variantId = null } = req.body;

        const cart = await Cart.findOne({ user: userId });
        if (!cart) return res.status(404).json({ message: 'Cart not found' });

        cart.items = cart.items.filter(
            item =>
                !(item.product.toString() === productId &&
                    ((item.variant && item.variant.toString()) || '') === (variantId || ''))
        );

        cart.cartTotal = calculateCartTotal(cart.items);
        cart.updatedAt = new Date();
        await cart.save();

        res.status(200).json({ message: 'Item removed from cart', cart });
    } catch (error) {
        console.error('Remove cart item error:', error);
        res.status(500).json({ message: 'Failed to remove item from cart' });
    }
};


export const clearCart = async (req, res) => {
    try {
        const userId = req.user._id;
        await Cart.findOneAndUpdate({ user: userId }, { items: [], cartTotal: 0, updatedAt: new Date() });

        res.status(200).json({ message: 'Cart cleared' });
    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({ message: 'Failed to clear cart' });
    }
};
