import mongoose, { set } from 'mongoose';

const { Schema, model } = mongoose;

const cartItemSchema = new Schema({
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    variant: {
        type: Schema.Types.ObjectId,
        ref: 'Variant',
        default: null,
        set: v => (v === '' ? null : v)
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
    priceAtCart: {
        type: Number,
        required: true,
    },
    totalPrice: {
        type: Number,
        required: true,
    }
}, { _id: false });

const cartSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    items: [cartItemSchema],
    cartTotal: {
        type: Number,
        default: 0,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    }
}, { timestamps: true });

export default model('Cart', cartSchema);
