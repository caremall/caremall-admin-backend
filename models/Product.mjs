import { model, Schema } from "mongoose";

const productSchema = new Schema(
    {
        // existing fields ...
        productName: { type: String, required: true, unique: true, trim: true },
        productDescription: { type: String, required: true },
        brand: { type: Schema.Types.ObjectId, ref: 'Brand', required: true },
        category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
        SKU: String,
        barcode: String,
        hasVariant: { type: Boolean, required: true },

        productImages: [String],
        tags: [String],

        costPrice: Number,
        sellingPrice: Number,
        mrpPrice: Number,
        discountPercent: Number,
        taxRate: Number,

        productStatus: {
            type: String,
            enum: ['Draft', 'Published', 'Archived'],
            default: 'Draft',
        },
        visibility: {
            type: String,
            enum: ['Visible', 'Hidden'],
            default: 'Visible',
        },
        isFeatured: { type: Boolean, default: false },
        isPreOrder: { type: Boolean, default: false },

        availableQuantity: { type: Number, default: 0 },
        minimumQuantity: { type: Number, default: 0 },
        reorderQuantity: { type: Number, default: 0 },
        maximumQuantity: { type: Number, default: 0 },


        weight: Number,
        dimensions: {
            length: Number,
            width: Number,
            height: Number
        },
        isFragile: Boolean,
        shippingClass: { type: String, trim: true },

        packageType: { type: String, trim: true },
        quantityPerBox: Number,

        supplierId: { type: String, trim: true },
        affiliateId: { type: String, trim: true },
        externalLinks: [String],

        // SEO
        metaTitle: String,
        metaDescription: String,
        urlSlug: { type: String, unique: true, lowercase: true, trim: true },
    },
    { timestamps: true }
);

export default model('Product', productSchema)
