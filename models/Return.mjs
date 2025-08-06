import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const returnSchema = new Schema(
    {
        order: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
            required: true,
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        item: {
            product: {
                type: Schema.Types.ObjectId,
                ref: 'Product',
                required: true,
            },
            variant: {
                type: Schema.Types.ObjectId,
                ref: 'Variant',
                default: null,
            },
            quantity: {
                type: Number,
                required: true,
                min: 1,
            },
            priceAtOrder: {
                type: Number,
                required: true,
            },
        },

        reason: {
            type: String,
            required: true,
            enum: ['damaged', 'wrong_item', 'not_needed', 'other'],
        },

        status: {
            type: String,
            enum: ['requested', 'approved', 'rejected', 'completed'],
            default: 'requested',
        },

        refundStatus: {
            type: String,
            enum: ['pending', 'refunded', 'not_applicable'],
            default: 'pending',
        },

        refundAmount: {
            type: Number,
            required: true,
        },

        comments: String,

        requestedAt: {
            type: Date,
            default: Date.now,
        },

        processedAt: Date,
        refundedAt: Date,
        pickupScheduled: {
            type: Boolean,
            default: false,
        },
        pickupDate: Date,
        pickupStatus: {
            type: String,
            enum: ['scheduled', 'picked_up', 'missed'],
        },
    },
    { timestamps: true }
);

export default model('Return', returnSchema);
