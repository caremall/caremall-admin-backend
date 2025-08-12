import Return from '../../models/Return.mjs';
import Order from '../../models/Order.mjs';

export const createReturnRequest = async (req, res) => {
        const userId = req.user._id;
        const {
            order,
            product,
            variant,
            quantity,
            priceAtOrder,
            reason,
            refundAmount,
            comments,
        } = req.body;

        const newReturn = await Return.create({
            order,
            user: userId,
            item: {
                product,
                variant,
                quantity,
                priceAtOrder,
            },
            reason,
            refundAmount,
            comments,
        });

        res.status(201).json({ success: true, return: newReturn });
};

export const getUserReturns = async (req, res) => {
    try {
        const userId = req.user._id;

        const returns = await Return.find({ user: userId })
            .populate('order', 'orderStatus paymentStatus totalAmount')
            .populate('item.product', 'productName')
            .populate('item.variant', 'attributeValues');

        res.json({ success: true, returns });
    } catch (err) {
        console.error('Error fetching returns:', err);
        res.status(500).json({ success: false, message: 'Failed to get returns' });
    }
};

export const getReturnById = async (req, res) => {
    try {
        const returnId = req.params.id;
        const userId = req.user._id;

        const returnDoc = await Return.findOne({ _id: returnId, user: userId })
            .populate('order', 'orderStatus paymentStatus')
            .populate('item.product', 'productName')
            .populate('item.variant', 'variantAttributes');

        if (!returnDoc) {
            return res.status(404).json({ success: false, message: 'Return not found' });
        }

        res.json({ success: true, return: returnDoc });
    } catch (err) {
        console.error('Error fetching return:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch return' });
    }
};

export const cancelReturnRequest = async (req, res) => {
    try {
        const returnId = req.params.id;
        const userId = req.user._id;

        const returnDoc = await Return.findOne({ _id: returnId, user: userId });

        if (!returnDoc) {
            return res.status(404).json({ success: false, message: 'Return not found' });
        }

        if (returnDoc.status !== 'requested') {
            return res.status(400).json({ success: false, message: 'Cannot cancel after approval or rejection' });
        }

        await Return.deleteOne({ _id: returnId });
        res.json({ success: true, message: 'Return request cancelled' });
    } catch (err) {
        console.error('Error cancelling return:', err);
        res.status(500).json({ success: false, message: 'Failed to cancel return' });
    }
};
