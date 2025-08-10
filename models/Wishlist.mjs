import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const wishlistSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
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
                addedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

export default model('Wishlist', wishlistSchema);
