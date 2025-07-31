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
                },
                value: {
                    type: String,
                },
            }
        ],

        SKU: {
            type: String,
            required: true,
            unique: true
        },

        barcode: {
            type: String,
            unique: true
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
