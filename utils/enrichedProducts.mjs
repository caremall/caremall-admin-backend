import Variant from '../models/Variant.mjs'

/**
 * Enriches a list of products with details from their default variant.
 * 
 * @param {Array} products - Array of product documents (can be Mongoose docs or plain objects)
 * @returns {Array} enrichedProducts - Products with merged variant data
 */
export const enrichProductsWithDefaultVariants = async (products) => {
    const productIdsWithVariants = products
        .filter(p => p.hasVariant && p.defaultVariant)
        .map(p => p.defaultVariant);

    if (productIdsWithVariants.length === 0) return products;

    const defaultVariants = await Variant.find({ _id: { $in: productIdsWithVariants } }).lean();

    const defaultVariantMap = {};
    for (const variant of defaultVariants) {
        defaultVariantMap[variant._id.toString()] = variant;
    }

    const enrichedProducts = products.map(product => {
        if (product.hasVariant && product.defaultVariant) {
            const variant = defaultVariantMap[product.defaultVariant.toString()];
            if (variant) {
                return {
                    ...product,
                    SKU: variant.SKU,
                    barcode: variant.barcode,
                    productImages: variant.images,
                    costPrice: variant.costPrice,
                    sellingPrice: variant.sellingPrice,
                    mrpPrice: variant.mrpPrice,
                    discountPercent: variant.discountPercent ?? product.discountPercent,
                    taxRate: variant.taxRate ?? product.taxRate,
                };
            }
        }
        return product;
    });

    return enrichedProducts;
};
