import Variant from '../models/Variant.mjs'

/**
 * Enriches a list of products with details from their default variant.
 * 
 * @param {Array} products - Array of product documents (can be Mongoose docs or plain objects)
 * @returns {Array} enrichedProducts - Products with merged variant data
 */
export const enrichProductsWithDefaultVariants = async (products) => {
  const productIds = products.map((p) => p._id);

  // Fetch variants for all products
  const allVariants = await Variant.find({
    productId: { $in: productIds },
  }).lean();

  // Group variants by productId
  const variantsByProduct = allVariants.reduce((acc, variant) => {
    const pid = variant.productId.toString();
    if (!acc[pid]) acc[pid] = [];
    acc[pid].push(variant);
    return acc;
  }, {});

  // Enrich products by merging default variant data (isDefault: true)
  return products.map((product) => {
    const variants = variantsByProduct[product._id.toString()] || [];
    const defaultVariant = variants.find((v) => v.isDefault) || null;
    if (defaultVariant) {
      return {
        ...product,
        SKU: defaultVariant.SKU ?? product.SKU,
        barcode: defaultVariant.barcode ?? product.barcode,
        productImages:
          defaultVariant.images && defaultVariant.images.length
            ? defaultVariant.images
            : product.productImages,
        costPrice: defaultVariant.costPrice ?? product.costPrice,
        sellingPrice: defaultVariant.sellingPrice ?? product.sellingPrice,
        landingSellPrice: defaultVariant.landingSellPrice ?? product.landingSellPrice,
        mrpPrice: defaultVariant.mrpPrice ?? product.mrpPrice,
        discountPercent:
          defaultVariant.discountPercent ?? product.discountPercent,
        taxRate: defaultVariant.taxRate ?? product.taxRate,
        variants, // optionally attach all variants
      };
    }
    // No default variant found, return product as-is
    return { ...product, variants };
  });
};
