import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const variantSchema = new Schema(
    {
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        variantAttributes: [
            {
                name: {
                    type: String,
                    required: true,
                }, // e.g., "Size", "Color"
                value: {
                    type: String,
                    required: true,
                }, // e.g., "M", "Red"
            }
        ],

        SKU: {
            type: String,
            required: true
        },

        barcode: {
            type: String,
            required: true
        },

        costPrice: { type: Number, required: true },

        sellingPrice: { type: Number, required: true },

        mrpPrice: { type: Number, required: true },

        discountPercent: { type: Number },

        taxRate: Number,

        images: [String],

        isDefault: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

export default model('Variant', variantSchema);
