import { model, Schema } from "mongoose";

const productSchema = new Schema(
    {
        productName: { type: String, required: true, unique: true, trim: true },
        shortDescription: { type: String, required: true },
        productDescription: { type: String, required: true },
        brand: { type: Schema.Types.ObjectId, ref: 'Brand', required: true },
        category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },

        hasVariant: { type: Boolean, required: true },

        SKU: {
            type: String,
            required: function () {
                return this.hasVariant === false;
            },
        },

        barcode: {
            type: String,
        },

        defaultVariant: {
            type: Schema.Types.ObjectId,
            ref: 'Variant',
        },

        productType: {
            type: Schema.Types.ObjectId,
            ref: 'ProductType',
            required: function () {
                return this.hasVariant === true;
            },
        },

        productImages: {
            type: [String],
            required: function () {
                return this.hasVariant === false;
            },
        },

        tags: [String],

        costPrice: {
            type: Number,
            required: function () {
                return this.hasVariant === false;
            },
        },
        sellingPrice: {
            type: Number,
            required: function () {
                return this.hasVariant === false;
            },
        },
        mrpPrice: {
            type: Number,
            required: function () {
                return this.hasVariant === false;
            },
        },

        discountPercent: Number,
        taxRate: Number,

        productStatus: {
            type: String,
            enum: ['draft', 'published', 'archived'],
            default: 'draft',
        },
        visibility: {
            type: String,
            enum: ['visible', 'hidden'],
            default: 'visible',
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

        metaTitle: String,
        metaDescription: String,
        urlSlug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        viewsCount: {
            type: Number,
            default: 0
        },
        addedToCartCount: {
            type: Number,
            default: 0,
        },
        wishlistCount: {
            type: Number,
            default: 0,
        },
        orderCount: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

export default model('Product', productSchema)
