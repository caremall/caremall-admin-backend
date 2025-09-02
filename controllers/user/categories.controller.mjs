import mongoose from "mongoose";
import Category from "../../models/Category.mjs";
import Product from "../../models/Product.mjs";
import Brand from "../../models/Brand.mjs";
import Variant from "../../models/Variant.mjs";

export const getCategoryProducts = async (req, res) => {
  try {
    // Parse standard filters
    const brands = req.query.brands
      ? Array.isArray(req.query.brands)
        ? req.query.brands
        : req.query.brands.split(',')
      : [];
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;
    const minDiscount = req.query.minDiscount ? Number(req.query.minDiscount) : undefined;
    const maxDiscount = req.query.maxDiscount ? Number(req.query.maxDiscount) : undefined;
    const status = req.query.status || 'published';

    const categoryId = req.params.id;
    if (!categoryId) {
      return res.status(400).json({ message: 'categoryId is required' });
    }

    // Fetch category and subcategories (only if main)
    const category = await Category.findById(categoryId)
      .select('_id type image name categoryCode status')
      .populate({
        path: 'subcategories',
        select: '_id type image name categoryCode status parentId',
      });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Parse subcategories from query, if present
    let categoriesToFilter = [];
    if (category.type === 'Main') {
      if (req.query.subcategories) {
        // Use only the explicitly chosen subcategories plus main category
        const subcategoryIds = req.query.subcategories
          .split(',')
          .map(id => new mongoose.Types.ObjectId(id.trim()));
        categoriesToFilter = [
          new mongoose.Types.ObjectId(String(categoryId)),
          ...subcategoryIds,
        ];
      } else {
        categoriesToFilter = [
          new mongoose.Types.ObjectId(String(categoryId)),
          ...category.subcategories.map(sub => new mongoose.Types.ObjectId(String(sub._id))),
        ];
      }
    } else {
      categoriesToFilter = [new mongoose.Types.ObjectId(String(categoryId))];
    }

    // Find products in specified categories
    const productIds = await Product.find({
      category: { $in: categoriesToFilter },
      productStatus: status,
    }).distinct('_id');

    // Parse dynamic variant attribute filters
    let filters = req.query.filters;
    if (filters && typeof filters === 'string') {
      try {
        filters = JSON.parse(filters);
      } catch {
        filters = {};
      }
    }
    filters = filters || {};

    // Build variant attribute filter query
    const variantAttributeFilters = [];
    for (const [attrName, attrValues] of Object.entries(filters)) {
      const valuesArray = Array.isArray(attrValues) ? attrValues : attrValues.split(',');
      variantAttributeFilters.push({
        variantAttributes: {
          $elemMatch: {
            name: { $regex: `^${attrName}$`, $options: 'i' },
            value: { $in: valuesArray },
          },
        },
      });
    }

    // Construct variant filter match object
    const variantMatch = {
      productId: { $in: productIds },
    };
    if (variantAttributeFilters.length > 0) {
      variantMatch.$and = variantAttributeFilters;
    }
    if (minPrice !== undefined && maxPrice !== undefined) {
      variantMatch.sellingPrice = { $gte: minPrice, $lte: maxPrice };
    }
    if (minDiscount !== undefined && maxDiscount !== undefined) {
      variantMatch.discountPercent = { $gte: minDiscount, $lte: maxDiscount };
    }

    const filteredVariants = await Variant.find(variantMatch);

    // Collect product IDs from filtered variants
    const filteredProductIdsFromVariants = [
      ...new Set(filteredVariants.map(v => v.productId.toString())),
    ];

    // Build product filter
    let productFilter = {
      category: { $in: categoriesToFilter },
      productStatus: status,
      $or: [
        { hasVariant: false },
        { _id: { $in: filteredProductIdsFromVariants } },
      ],
    };

    if (brands.length > 0) {
      productFilter.brand = {
        $in: brands.map(id => new mongoose.Types.ObjectId(String(id))),
      };
    }

    // Non-variant product price/discount filtering
    if (minPrice !== undefined && maxPrice !== undefined) {
      productFilter.$or = productFilter.$or.map(cond => {
        if (cond.hasVariant === false) {
          return {
            hasVariant: false,
            sellingPrice: { $gte: minPrice, $lte: maxPrice },
          };
        }
        return cond;
      });
    }
    if (minDiscount !== undefined && maxDiscount !== undefined) {
      productFilter.$or = productFilter.$or.map(cond => {
        if (cond.hasVariant === false) {
          return {
            hasVariant: false,
            discountPercent: { $gte: minDiscount, $lte: maxDiscount },
          };
        }
        return cond;
      });
    }

    // Fetch filtered products
    const products = await Product.find(productFilter)
      .select('_id productName brand category urlSlug productStatus hasVariant sellingPrice defaultVariant productImages')
      .populate('brand', '_id brandName imageUrl')
      .sort({ sellingPrice: 1 });

    // Aggregate available variant attributes for filter dropdown
    const variantAttributesAggregation = await Variant.aggregate([
      { $match: { productId: { $in: productIds } } },
      { $unwind: '$variantAttributes' },
      {
        $group: {
          _id: { name: '$variantAttributes.name', value: '$variantAttributes.value' },
        },
      },
      {
        $group: {
          _id: '$_id.name',
          values: { $addToSet: '$_id.value' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const variantFilters = {};
    variantAttributesAggregation.forEach(attr => {
      variantFilters[attr._id] = attr.values.filter(v => v != null && v !== '');
    });

    // Aggregate price and discount ranges from products and variants
    const productPriceRange = await Product.aggregate([
      {
        $match: {
          category: { $in: categoriesToFilter },
          productStatus: status,
          sellingPrice: { $exists: true, $gt: 0 },
          discountPercent: { $exists: true, $gte: 0 },
        },
      },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$sellingPrice' },
          maxPrice: { $max: '$sellingPrice' },
          minDiscount: { $min: '$discountPercent' },
          maxDiscount: { $max: '$discountPercent' },
        },
      },
    ]);

    const variantProductIds = products.filter(p => p.hasVariant).map(p => p._id);

    const variantPriceRange = await Variant.aggregate([
      {
        $match: {
          productId: { $in: variantProductIds },
          sellingPrice: { $exists: true, $gt: 0 },
          discountPercent: { $exists: true, $gte: 0 },
        },
      },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$sellingPrice' },
          maxPrice: { $max: '$sellingPrice' },
          minDiscount: { $min: '$discountPercent' },
          maxDiscount: { $max: '$discountPercent' },
        },
      },
    ]);

    const combinedMinPrice = Math.min(
      productPriceRange[0]?.minPrice ?? Infinity,
      variantPriceRange[0]?.minPrice ?? Infinity
    );
    const combinedMaxPrice = Math.max(
      productPriceRange[0]?.maxPrice ?? 0,
      variantPriceRange[0]?.maxPrice ?? 0
    );
    const combinedMinDiscount = Math.min(
      productPriceRange[0]?.minDiscount ?? Infinity,
      variantPriceRange[0]?.minDiscount ?? Infinity
    );
    const combinedMaxDiscount = Math.max(
      productPriceRange[0]?.maxDiscount ?? 0,
      variantPriceRange[0]?.maxDiscount ?? 0
    );

    const minPriceFinal =
      Number.isFinite(combinedMinPrice) && combinedMinPrice !== Infinity
        ? combinedMinPrice
        : 0;
    const maxPriceFinal =
      Number.isFinite(combinedMaxPrice) && combinedMaxPrice !== 0
        ? combinedMaxPrice
        : minPriceFinal;
    const minDiscountFinal =
      Number.isFinite(combinedMinDiscount) && combinedMinDiscount !== Infinity
        ? combinedMinDiscount
        : 0;
    const maxDiscountFinal = Number.isFinite(combinedMaxDiscount)
      ? combinedMaxDiscount
      : minDiscountFinal;

    // Get available brands for filter dropdown
    const availableBrandIds = await Product.distinct('brand', {
      category: { $in: categoriesToFilter },
    });
    const availableBrands = await Brand.find({
      _id: { $in: availableBrandIds },
      status: 'active',
    }).select('_id brandName imageUrl');

    // Return response
    res.status(200).json({
      category,
      products,
      filterOptions: {
        subcategories: category.type === 'Main' ? category.subcategories : [],
        variantAttributes: variantFilters,
        brands: availableBrands,
        priceRange: { min: minPriceFinal, max: maxPriceFinal },
        discountRange: { min: minDiscountFinal, max: maxDiscountFinal },
      },
      selectedFilters: {
        filters,
        brands,
        subcategories:
          req.query.subcategories && category.type === 'Main'
            ? req.query.subcategories.split(',').map(s => s.trim())
            : [],
        priceRange: { min: minPrice ?? 0, max: maxPrice ?? maxPriceFinal },
        discountRange: {
          min: minDiscount ?? 0,
          max: maxDiscount ?? maxDiscountFinal,
        },
      },
    });
  } catch (error) {
    console.error(
      'Error fetching category products with dynamic filters:',
      error
    );
    res.status(500).json({ message: 'Internal server error' });
  }
};


export const getAllCategories = async (req, res) => {
  try {
    const { search = "", type, status, parentId,isPopular } = req.query;

    const filter = {};

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (parentId) filter.parentId = parentId;
    if(isPopular) filter.isPopular = isPopular === 'true';
    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const categories = await Category.find(filter)
      .populate("products").populate("subcategories")
      .sort({ createdAt: -1 });

    res.status(200).json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
};