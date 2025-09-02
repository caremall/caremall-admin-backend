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
        : req.query.brands.split(",")
      : [];
    const minPrice = req.query.minPrice
      ? Number(req.query.minPrice)
      : undefined;
    const maxPrice = req.query.maxPrice
      ? Number(req.query.maxPrice)
      : undefined;
    const minDiscount = req.query.minDiscount
      ? Number(req.query.minDiscount)
      : undefined;
    const maxDiscount = req.query.maxDiscount
      ? Number(req.query.maxDiscount)
      : undefined;
    const status = req.query.status || "published";

    const categoryId = req.params.id;
    if (!categoryId) {
      return res.status(400).json({ message: "categoryId is required" });
    }

    // Fetch category with direct subcategories (if main)
    const category = await Category.findById(categoryId)
      .select("_id type image name categoryCode status")
      .populate({
        path: "subcategories",
        select: "_id type image name categoryCode status parentId",
        match: { status: "active" }, // only active subcategories
      });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Determine categories to filter for products
    let categoriesToFilter = [];
    if (category.type === "Main") {
      // For main category, only include its subcategories (exclude main category itself to not mix products)
      categoriesToFilter = category.subcategories.map(
        (sub) => new mongoose.Types.ObjectId(sub._id)
      );
    } else {
      // For subcategory, filter only on itself
      categoriesToFilter = [new mongoose.Types.ObjectId(categoryId)];
    }

    // If no subcategories under main (empty array), return empty list early
    if (category.type === "Main" && categoriesToFilter.length === 0) {
      return res.status(200).json({
        category,
        products: [],
        filterOptions: {
          subcategories: [],
          variantAttributes: {},
          brands: [],
          priceRange: { min: 0, max: 0 },
          discountRange: { min: 0, max: 0 },
        },
        selectedFilters: {
          filters: {},
          brands: [],
          subcategories: [],
          priceRange: { min: 0, max: 0 },
          discountRange: { min: 0, max: 0 },
        },
      });
    }

    // Find product IDs in the subcategories or single subcategory
    const productIds = await Product.find({
      category: { $in: categoriesToFilter },
      productStatus: status,
    }).distinct("_id");

    // Parse dynamic variant attribute filters from 'filters' query param
    let filters = req.query.filters;
    if (filters && typeof filters === "string") {
      try {
        filters = JSON.parse(filters);
      } catch {
        filters = {};
      }
    }
    filters = filters || {};

    // Build variant attribute filters dynamically
    const variantAttributeFilters = [];
    for (const [attrName, attrValues] of Object.entries(filters)) {
      const valuesArray = Array.isArray(attrValues)
        ? attrValues
        : attrValues.split(",");
      variantAttributeFilters.push({
        variantAttributes: {
          $elemMatch: {
            name: { $regex: `^${attrName}$`, $options: "i" },
            value: { $in: valuesArray },
          },
        },
      });
    }

    // Build variant filter match query
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

    // Collect filtered product IDs from variants
    const filteredProductIdsFromVariants = [
      ...new Set(filteredVariants.map((v) => v.productId.toString())),
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
        $in: brands.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    // Filter price & discount for non-variant products inside $or
    if (minPrice !== undefined && maxPrice !== undefined) {
      productFilter.$or = productFilter.$or.map((cond) => {
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
      productFilter.$or = productFilter.$or.map((cond) => {
        if (cond.hasVariant === false) {
          return {
            hasVariant: false,
            discountPercent: { $gte: minDiscount, $lte: maxDiscount },
          };
        }
        return cond;
      });
    }

    // Fetch filtered products with brand populated and sorted by selling price
    const products = await Product.find(productFilter)
      .select(
        "_id productName brand category urlSlug productStatus hasVariant sellingPrice defaultVariant productImages"
      )
      .populate("brand", "_id brandName imageUrl")
      .sort({ sellingPrice: 1 });

    // Aggregate variant attributes for filter options
    const variantAttributesAggregation = await Variant.aggregate([
      { $match: { productId: { $in: productIds } } },
      { $unwind: "$variantAttributes" },
      {
        $group: {
          _id: {
            name: "$variantAttributes.name",
            value: "$variantAttributes.value",
          },
        },
      },
      {
        $group: {
          _id: "$_id.name",
          values: { $addToSet: "$_id.value" },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const variantFilters = {};
    variantAttributesAggregation.forEach((attr) => {
      variantFilters[attr._id] = attr.values.filter(
        (v) => v != null && v !== ""
      );
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
          minPrice: { $min: "$sellingPrice" },
          maxPrice: { $max: "$sellingPrice" },
          minDiscount: { $min: "$discountPercent" },
          maxDiscount: { $max: "$discountPercent" },
        },
      },
    ]);

    const variantProductIds = products
      .filter((p) => p.hasVariant)
      .map((p) => p._id);

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
          minPrice: { $min: "$sellingPrice" },
          maxPrice: { $max: "$sellingPrice" },
          minDiscount: { $min: "$discountPercent" },
          maxDiscount: { $max: "$discountPercent" },
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
    const availableBrandIds = await Product.distinct("brand", {
      category: { $in: categoriesToFilter },
    });
    const availableBrands = await Brand.find({
      _id: { $in: availableBrandIds },
      status: "active",
    }).select("_id brandName imageUrl");

    // Return final response - subcategories property only shows direct active subcategories if main category
    res.status(200).json({
      category,
      products,
      filterOptions: {
        subcategories: category.type === "Main" ? category.subcategories : [],
        variantAttributes: variantFilters,
        brands: availableBrands,
        priceRange: { min: minPriceFinal, max: maxPriceFinal },
        discountRange: { min: minDiscountFinal, max: maxDiscountFinal },
      },
      selectedFilters: {
        filters,
        brands,
        subcategories:
          req.query.subcategories && category.type === "Main"
            ? req.query.subcategories.split(",").map((s) => s.trim())
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
      "Error fetching category products with dynamic filters:",
      error
    );
    res.status(500).json({ message: "Internal server error" });
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

export const getSubcategoriesWithProducts = async (req, res) => {
  try {
    const mainCategoryId = req.params.id;
    if (!mainCategoryId) {
      return res.status(400).json({ message: "Main category ID is required" });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(mainCategoryId)) {
      return res.status(400).json({ message: "Invalid main category ID" });
    }

    // Fetch the main category with its subcategories
    const mainCategory = await Category.findById(mainCategoryId)
      .select("_id name type")
      .populate({
        path: "subcategories",
        select: "_id name categoryCode status",
        match: { status: "active" }, // only active subcategories
      });

    if (!mainCategory) {
      return res.status(404).json({ message: "Main category not found" });
    }

    // For each subcategory, fetch its products (published only)
    const subcategoriesWithProducts = await Promise.all(
      mainCategory.subcategories.map(async (subcat) => {
        const products = await Product.find({
          category: subcat._id,
          productStatus: "published",
        })
          .select("_id productName sellingPrice productImages urlSlug brand")
          .populate("brand", "_id brandName imageUrl");

        return {
          _id: subcat._id,
          name: subcat.name,
          categoryCode: subcat.categoryCode,
          status: subcat.status,
          products,
        };
      })
    );

    res.status(200).json({
      mainCategory: {
        _id: mainCategory._id,
        name: mainCategory.name,
      },
      subcategories: subcategoriesWithProducts,
    });
  } catch (error) {
    console.error("Error fetching subcategories with products:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
