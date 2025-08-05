import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const orderSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        items: [
            {
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

                totalPrice: {
                    type: Number,
                    required: true,
                },
            },
        ],

        shippingAddress: {
            fullName: String,
            phone: String,
            addressLine1: String,
            addressLine2: String,
            city: String,
            state: String,
            postalCode: String,
            country: String,
        },
        billingAddress: {
            fullName: String,
            phone: String,
            addressLine1: String,
            addressLine2: String,
            city: String,
            state: String,
            postalCode: String,
            country: String,
        },
        paymentMethod: {
            type: String,
            enum: ['cod', 'card', 'upi', 'paypal'],
            required: true,
        },

        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed'],
            default: 'pending',
        },

        orderStatus: {
            type: String,
            enum: ['processing', 'shipped', 'delivered', 'cancelled'],
            default: 'processing',
        },

        totalAmount: {
            type: Number,
            required: true,
        },

        isDelivered: {
            type: Boolean,
            default: false,
        },

        deliveredAt: Date,
    },
    { timestamps: true }
);

export default model('Order', orderSchema);
