import mongoose from "mongoose";
import Product from "../../models/Product.mjs";
import Variant from "../../models/Variant.mjs";
import Category from "../../models/Category.mjs";
import { enrichProductsWithDefaultVariants } from "../../utils/enrichedProducts.mjs";
import Warehouse from "../../models/Warehouse.mjs";
import Review from "../../models/Review.mjs";
import Brand from "../../models/Brand.mjs";
import inventory from "../../models/inventory.mjs";
// import FirstOrder from "../../models/FirstOrder.mjs";

// export const getFilteredProducts = async (req, res) => {
//   try {
//     const { category, brand, tags, search, color, size, minPrice, maxPrice } =
//       req.query;

//     // Step 1: Build variant filter
//     const variantMatch = {};

//     const variantFilters = [];
//     if (color) variantFilters.push({ name: "color", value: color });
//     if (size) variantFilters.push({ name: "size", value: size });

//     if (variantFilters.length) {
//       variantMatch.variantAttributes = {
//         $all: variantFilters.map((attr) => ({
//           $elemMatch: attr,
//         })),
//       };
//     }

//     if (minPrice || maxPrice) {
//       const priceFilter = {};
//       if (minPrice) priceFilter.$gte = parseFloat(minPrice);
//       if (maxPrice) priceFilter.$lte = parseFloat(maxPrice);
//       variantMatch.sellingPrice = priceFilter;
//     }

//     // Step 2: Find matching variant productIds
//     const matchedVariants = await Variant.find(variantMatch)
//       .select("productId")
//       .lean();
//     const matchingProductIds = [
//       ...new Set(matchedVariants.map((v) => v.productId.toString())),
//     ];

//     // Step 3: Build product filter
//     const productMatch = {
//       productStatus: "published",
//       visibility: "visible",
//     };

//     if (category) productMatch.category = new mongoose.Types.ObjectId(category);
//     if (brand) productMatch.brand = new mongoose.Types.ObjectId(brand);
//     if (tags) productMatch.tags = { $in: tags.split(",") };
//     if (search) {
//       const regex = new RegExp(search, "i");
//       productMatch.$or = [
//         { productName: regex },
//         { shortDescription: regex },
//         { productDescription: regex },
//       ];
//     }

//     if (matchingProductIds.length) {
//       productMatch._id = { $in: matchingProductIds };
//     } else if (variantFilters.length || minPrice || maxPrice) {
//       // If variant filters applied but no match, return empty
//       return res.status(200).json({
//         data: [],
//       });
//     }

//     // Step 4: Fetch filtered products with pagination
//     const [products, totalCount] = await Promise.all([
//       Product.find(productMatch).populate("brand category").lean(),
//       Product.countDocuments(productMatch),
//     ]);

//     // Step 5: Enrich with matching variants for each product
//     const enrichedProducts = await Promise.all(
//       products.map(async (product) => {
//         const variants = await Variant.find({
//           productId: product._id,
//           ...(variantFilters.length || minPrice || maxPrice
//             ? variantMatch
//             : {}),
//         }).lean();

//         // Aggregate review stats per product
//         const reviewStats = await Review.aggregate([
//           { $match: { productId: product._id } },
//           {
//             $group: {
//               _id: "$productId",
//               averageRating: { $avg: "$rating" },
//               reviewCount: { $sum: 1 },
//             },
//           },
//         ]);

//         const averageRating = reviewStats.length
//           ? reviewStats[0].averageRating
//           : 0;
//         const reviewCount = reviewStats.length ? reviewStats[0].reviewCount : 0;

//         return {
//           ...product,
//           variants,
//           averageRating: Number(averageRating.toFixed(2)),
//           reviewCount,
//         };
//       })
//     );

//     res.status(200).json({
//       data: enrichedProducts,
//     });
//   } catch (error) {
//     console.error("Error filtering products:", error);
//     res.status(500).json({ message: "Server error while filtering products" });
//   }
// };

export const getFilteredProducts = async (req, res) => {
  try {
    // Parse filters from query params
    const brands = req.query.brands
      ? Array.isArray(req.query.brands)
        ? req.query.brands
        : req.query.brands.split(",")
      : [];

    // SEPARATE CATEGORIES AND SUBCATEGORIES
    const categories = req.query.categories
      ? Array.isArray(req.query.categories)
        ? req.query.categories
        : req.query.categories.split(",")
      : [];

    const subcategories = req.query.subcategories
      ? Array.isArray(req.query.subcategories)
        ? req.query.subcategories
        : req.query.subcategories.split(",")
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

    // Extract variant attribute filters from query params (excluding reserved fields)
    const reservedFields = [
      "brands",
      "categories",
      "subcategories",
      "minPrice",
      "maxPrice",
      "minDiscount",
      "maxDiscount",
      "status",
      "page",
      "limit",
    ];

    const filters = {};
    Object.keys(req.query).forEach((key) => {
      if (!reservedFields.includes(key)) {
        filters[key] = req.query[key];
      }
    });

    // Build base product match - FIXED CATEGORY/SUBCATEGORY LOGIC
    let productMatch = { productStatus: status, visibility: "visible" };

    if (brands.length > 0) {
      productMatch.brand = {
        $in: brands.map((id) => new mongoose.Types.ObjectId(String(id))),
      };
    }

    // CORRECTED: SIMPLIFIED CATEGORY FILTERING LOGIC
    const categoryConditions = [];

    // If categories are selected, filter by main categories
    if (categories.length > 0) {
      categoryConditions.push({
        category: {
          $in: categories.map((id) => new mongoose.Types.ObjectId(String(id))),
        },
      });
    }

    // If subcategories are selected, filter by subcategories
    if (subcategories.length > 0) {
      categoryConditions.push({
        subcategory: {
          $in: subcategories.map(
            (id) => new mongoose.Types.ObjectId(String(id))
          ),
        },
      });
    }

    // Apply category conditions with OR logic for initial matching
    if (categoryConditions.length > 0) {
      productMatch.$or = categoryConditions;
    }

    // Get product IDs that match the initial filters
    const productIds = await Product.find(productMatch).distinct("_id");

    // Build variant attribute filters
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

    // Query variants matching filters
    const variantMatch = { productId: { $in: productIds } };
    if (variantAttributeFilters.length > 0) {
      variantMatch.$and = variantAttributeFilters;
    }
    if (minPrice !== undefined && maxPrice !== undefined) {
      variantMatch.sellingPrice = { $gte: minPrice, $lte: maxPrice };
    }

    if (minDiscount !== undefined && maxDiscount !== undefined) {
      variantMatch.$expr = {
        $and: [
          {
            $gte: [
              {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ["$mrpPrice", "$landingSellPrice"] },
                      "$mrpPrice",
                    ],
                  },
                  100,
                ],
              },
              minDiscount,
            ],
          },
          {
            $lte: [
              {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ["$mrpPrice", "$landingSellPrice"] },
                      "$mrpPrice",
                    ],
                  },
                  100,
                ],
              },
              maxDiscount,
            ],
          },
        ],
      };
    }

    const filteredVariants = await Variant.find(variantMatch).lean();

    // Collect product IDs from filtered variants
    const filteredProductIdsFromVariants = [
      ...new Set(filteredVariants.map((v) => v.productId.toString())),
    ];

    // CORRECTED: Build final product filter with PROPER CATEGORY/SUBCATEGORY HANDLING
    let productFilter = {
      productStatus: status,
      visibility: "visible",
      $or: [
        { hasVariant: false },
        {
          _id: {
            $in: filteredProductIdsFromVariants.map(
              (id) => new mongoose.Types.ObjectId(id)
            ),
          },
        },
      ],
    };

    if (brands.length > 0) {
      productFilter.brand = {
        $in: brands.map((id) => new mongoose.Types.ObjectId(String(id))),
      };
    }

    // CORRECTED: FINAL CATEGORY FILTERING - APPLY BOTH CATEGORY AND SUBCATEGORY FILTERS
    const finalCategoryConditions = [];

    // Apply category filter if categories are selected
    if (categories.length > 0) {
      finalCategoryConditions.push({
        category: {
          $in: categories.map((id) => new mongoose.Types.ObjectId(String(id))),
        },
      });
    }

    // Apply subcategory filter if subcategories are selected
    if (subcategories.length > 0) {
      finalCategoryConditions.push({
        subcategory: {
          $in: subcategories.map(
            (id) => new mongoose.Types.ObjectId(String(id))
          ),
        },
      });
    }

    // CORRECTED: Apply the final category conditions
    if (finalCategoryConditions.length > 0) {
      // If we have multiple conditions, use AND logic to ensure both are satisfied
      if (finalCategoryConditions.length > 1) {
        productFilter.$and = productFilter.$and || [];
        productFilter.$and.push(...finalCategoryConditions);
      } else {
        // If only one condition, apply it directly
        Object.assign(productFilter, finalCategoryConditions[0]);
      }
    }

    // Filter products without variants by price and discount
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
      const discountExpr = {
        $expr: {
          $and: [
            {
              $gte: [
                {
                  $multiply: [
                    {
                      $divide: [
                        { $subtract: ["$mrpPrice", "$landingSellPrice"] },
                        "$mrpPrice",
                      ],
                    },
                    100,
                  ],
                },
                minDiscount,
              ],
            },
            {
              $lte: [
                {
                  $multiply: [
                    {
                      $divide: [
                        { $subtract: ["$mrpPrice", "$landingSellPrice"] },
                        "$mrpPrice",
                      ],
                    },
                    100,
                  ],
                },
                maxDiscount,
              ],
            },
          ],
        },
      };

      productFilter.$or = [
        {
          hasVariant: false,
          ...discountExpr,
        },
        {
          _id: {
            $in: filteredProductIdsFromVariants.map(
              (id) => new mongoose.Types.ObjectId(id)
            ),
          },
        },
      ];
    }

    // Fetch filtered products with proper population
    const products = await Product.find(productFilter)
      .select(
        "_id productName brand category subcategory urlSlug productStatus visibility hasVariant sellingPrice defaultVariant productImages mrpPrice SKU barcode costPrice discountPercent taxRate landingSellPrice"
      )
      .populate("brand", "_id brandName imageUrl")
      .populate("category", "_id name image")
      .populate("subcategory", "_id name image")
      .sort({ sellingPrice: 1 })
      .lean();

    // MODIFIED: Build products array with variants grouped under parent products
    const productsWithVariants = [];
    const variantsByProductId = filteredVariants.reduce((acc, v) => {
      const pid = v.productId.toString();
      if (!acc[pid]) acc[pid] = [];
      acc[pid].push(v);
      return acc;
    }, {});

    for (const product of products) {
      if (product.hasVariant) {
        // Get matching variants for this product
        const matchingVariants =
          variantsByProductId[product._id.toString()] || [];

        // Create product with variants array
        const productWithVariants = {
          _id: product._id,
          type: "product",
          productName: product.productName,
          brand: product.brand,
          category: product.category,
          subcategory: product.subcategory,
          urlSlug: product.urlSlug,
          productStatus: product.productStatus,
          hasVariant: true,
          variants: matchingVariants.map((variant) => ({
            _id: variant._id,
            variantId: variant.variantId,
            variantAttributes: variant.variantAttributes,
            SKU: variant.SKU,
            barcode: variant.barcode,
            productImages:
              variant.images && variant.images.length
                ? variant.images
                : product.productImages,
            costPrice: variant.costPrice,
            sellingPrice: variant.sellingPrice,
            mrpPrice: variant.mrpPrice,
            landingSellPrice: variant.landingSellPrice,
            discountPercent: variant.discountPercent,
            taxRate: variant.taxRate,
            isDefault: variant.isDefault,
          })),
          // Include product-level fields for easy access
          productImages: product.productImages,
          minSellingPrice:
            matchingVariants.length > 0
              ? Math.min(...matchingVariants.map((v) => v.sellingPrice))
              : product.sellingPrice,
          maxSellingPrice:
            matchingVariants.length > 0
              ? Math.max(...matchingVariants.map((v) => v.sellingPrice))
              : product.sellingPrice,
          variantCount: matchingVariants.length,
        };

        productsWithVariants.push(productWithVariants);
      } else {
        // Add product without variant
        productsWithVariants.push({
          _id: product._id,
          type: "product",
          productName: product.productName,
          brand: product.brand,
          category: product.category,
          subcategory: product.subcategory,
          urlSlug: product.urlSlug,
          productStatus: product.productStatus,
          hasVariant: false,
          SKU: product.SKU,
          barcode: product.barcode,
          productImages: product.productImages,
          costPrice: product.costPrice,
          sellingPrice: product.sellingPrice,
          mrpPrice: product.mrpPrice,
          landingSellPrice: product.landingSellPrice,
          discountPercent: product.discountPercent,
          taxRate: product.taxRate,
          variants: [], // Empty variants array for consistency
        });
      }
    }

    // MODIFIED: Filter options should only show available options based on current selection
    // Get available brands from filtered products
    const availableBrandIds = [
      ...new Set(productsWithVariants.map((p) => p.brand._id.toString())),
    ];
    const availableBrands = await Brand.find({
      _id: { $in: availableBrandIds },
      status: "active",
    }).select("_id brandName imageUrl");

    // Get available categories and subcategories from filtered products
    const availableCategoryIds = [
      ...new Set(
        productsWithVariants.map((p) =>
          p.category._id ? p.category._id.toString() : p.category.toString()
        )
      ),
    ];

    const availableSubcategoryIds = [
      ...new Set(
        productsWithVariants
          .filter((p) => p.subcategory)
          .map((p) =>
            p.subcategory._id
              ? p.subcategory._id.toString()
              : p.subcategory.toString()
          )
      ),
    ];

    const availableCategories = await Category.find({
      _id: { $in: availableCategoryIds },
      status: "active",
    }).select("_id name image type parentId");

    // Get all subcategories for the available main categories
    const mainCategories = availableCategories.filter(
      (cat) => cat.type === "Main"
    );
    const mainCategoryIds = mainCategories.map((cat) => cat._id);

    const allSubcategories = await Category.find({
      $or: [
        { parentId: { $in: mainCategoryIds } },
        { _id: { $in: availableSubcategoryIds } },
      ],
      status: "active",
    }).select("_id name image parentId type");

    // Create the subcategories response
    const subcategoriesResponse = {
      subcategories: allSubcategories.map((subcat) => ({
        _id: subcat._id,
        name: subcat.name,
        image: subcat.image,
        parentId: subcat.parentId,
        type: subcat.type,
      })),
    };

    // CORRECTED: Aggregate price and discount ranges from FILTERED products
    const productPriceRange = await Product.aggregate([
      {
        $match: {
          _id: { $in: products.map((p) => p._id) },
          productStatus: status,
          sellingPrice: { $exists: true, $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          minPrice: { $min: "$sellingPrice" },
          maxPrice: { $max: "$sellingPrice" },
          minDiscount: { $min: "$0" },
          maxDiscount: { $max: "$discountPercent" },
        },
      },
    ]);

    const variantPriceRange = await Variant.aggregate([
      {
        $match: {
          productId: {
            $in: products.filter((p) => p.hasVariant).map((p) => p._id),
          },
          sellingPrice: { $exists: true, $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          minPrice: { $min: "$sellingPrice" },
          maxPrice: { $max: "$sellingPrice" },
          minDiscount: { $min: "$0" },
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

    // Aggregate variant attributes for filter options from filtered products
    const variantAttributesAggregation = await Variant.aggregate([
      {
        $match: {
          productId: {
            $in: products.filter((p) => p.hasVariant).map((p) => p._id),
          },
        },
      },
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

    // === ADD INVENTORY AVAILABILITY ===

    for (const product of productsWithVariants) {
      if (product.hasVariant && product.variants.length > 0) {
        // For each variant, find total available quantity
        for (const variant of product.variants) {
          const totalStock = await inventory.aggregate([
            {
              $match: {
                product: new mongoose.Types.ObjectId(product._id),
                variant: new mongoose.Types.ObjectId(variant._id),
              },
            },
            {
              $group: {
                _id: null,
                totalAvailableQuantity: { $sum: "$AvailableQuantity" },
              },
            },
          ]);

          variant.totalAvailableQuantity =
            totalStock[0]?.totalAvailableQuantity || 0;
        }

        // Product-level total = sum of its variants
        product.totalAvailableQuantity = product.variants.reduce(
          (sum, v) => sum + (v.totalAvailableQuantity || 0),
          0
        );
      } else {
        // Non-variant product
        const totalStock = await inventory.aggregate([
          {
            $match: {
              product: new mongoose.Types.ObjectId(product._id),
            },
          },
          {
            $group: {
              _id: null,
              totalAvailableQuantity: { $sum: "$AvailableQuantity" },
            },
          },
        ]);

        product.totalAvailableQuantity =
          totalStock[0]?.totalAvailableQuantity || 0;
      }
    }

    const variantFilters = {};
    variantAttributesAggregation.forEach((attr) => {
      variantFilters[attr._id] = attr.values
        .filter((v) => v != null && v !== "")
        .sort();
    });

    res.status(200).json({
      products: productsWithVariants, // MODIFIED: Use productsWithVariants instead of flatProducts
      filterOptions: {
        variantAttributes: variantFilters,
        brands: availableBrands,
        categories: availableCategories.filter((cat) => cat.type === "Main"),
        subcategories: subcategoriesResponse,
        priceRange: { min: minPriceFinal, max: maxPriceFinal },
        discountRange: { min: minDiscountFinal, max: maxDiscountFinal },
      },
      selectedFilters: {
        filters,
        brands,
        categories,
        subcategories,
        priceRange: { min: minPrice ?? 0, max: maxPrice ?? maxPriceFinal },
        discountRange: {
          min: minDiscount ?? 0,
          max: maxDiscount ?? maxDiscountFinal,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching filtered products:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getFilteredProductsUpdated = async (req, res) => {
  try {
    // Parse filters from query params
    const brands = req.query.brands
      ? Array.isArray(req.query.brands)
        ? req.query.brands
        : req.query.brands.split(",")
      : [];

    // SEPARATE CATEGORIES AND SUBCATEGORIES
    const categories = req.query.categories
      ? Array.isArray(req.query.categories)
        ? req.query.categories
        : req.query.categories.split(",")
      : [];

    const subcategories = req.query.subcategories
      ? Array.isArray(req.query.subcategories)
        ? req.query.subcategories
        : req.query.subcategories.split(",")
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

    // Extract variant attribute filters from query params (excluding reserved fields)
    const reservedFields = [
      "brands",
      "categories",
      "subcategories",
      "minPrice",
      "maxPrice",
      "minDiscount",
      "maxDiscount",
      "status",
      "page",
      "limit",
    ];

    const filters = {};
    Object.keys(req.query).forEach((key) => {
      if (!reservedFields.includes(key)) {
        filters[key] = req.query[key];
      }
    });

    // Build base product match - FIXED CATEGORY/SUBCATEGORY LOGIC
    let productMatch = { productStatus: status, visibility: "visible" };

    if (brands.length > 0) {
      productMatch.brand = {
        $in: brands.map((id) => new mongoose.Types.ObjectId(String(id))),
      };
    }

    // CORRECTED: SIMPLIFIED CATEGORY FILTERING LOGIC
    const categoryConditions = [];

    // If categories are selected, filter by main categories
    if (categories.length > 0) {
      categoryConditions.push({
        category: {
          $in: categories.map((id) => new mongoose.Types.ObjectId(String(id))),
        },
      });
    }

    // If subcategories are selected, filter by subcategories
    if (subcategories.length > 0) {
      categoryConditions.push({
        subcategory: {
          $in: subcategories.map(
            (id) => new mongoose.Types.ObjectId(String(id))
          ),
        },
      });
    }

    // Apply category conditions with OR logic for initial matching
    if (categoryConditions.length > 0) {
      productMatch.$or = categoryConditions;
    }

    // Get product IDs that match the initial filters
    const productIds = await Product.find(productMatch).distinct("_id");

    // Build variant attribute filters
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

    // Query variants matching filters
    const variantMatch = { productId: { $in: productIds } };
    if (variantAttributeFilters.length > 0) {
      variantMatch.$and = variantAttributeFilters;
    }
    if (minPrice !== undefined && maxPrice !== undefined) {
      variantMatch.sellingPrice = { $gte: minPrice, $lte: maxPrice };
    }

    if (minDiscount !== undefined && maxDiscount !== undefined) {
      variantMatch.$expr = {
        $and: [
          {
            $gte: [
              {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ["$mrpPrice", "$landingSellPrice"] },
                      "$mrpPrice",
                    ],
                  },
                  100,
                ],
              },
              minDiscount,
            ],
          },
          {
            $lte: [
              {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ["$mrpPrice", "$landingSellPrice"] },
                      "$mrpPrice",
                    ],
                  },
                  100,
                ],
              },
              maxDiscount,
            ],
          },
        ],
      };
    }

    const filteredVariants = await Variant.find(variantMatch).lean();

    // Collect product IDs from filtered variants
    const filteredProductIdsFromVariants = [
      ...new Set(filteredVariants.map((v) => v.productId.toString())),
    ];

    // CORRECTED: Build final product filter with PROPER CATEGORY/SUBCATEGORY HANDLING
    let productFilter = {
      productStatus: status,
      visibility: "visible",
      $or: [
        { hasVariant: false },
        {
          _id: {
            $in: filteredProductIdsFromVariants.map(
              (id) => new mongoose.Types.ObjectId(id)
            ),
          },
        },
      ],
    };

    if (brands.length > 0) {
      productFilter.brand = {
        $in: brands.map((id) => new mongoose.Types.ObjectId(String(id))),
      };
    }

    // CORRECTED: FINAL CATEGORY FILTERING - APPLY BOTH CATEGORY AND SUBCATEGORY FILTERS
    const finalCategoryConditions = [];

    // Apply category filter if categories are selected
    if (categories.length > 0) {
      finalCategoryConditions.push({
        category: {
          $in: categories.map((id) => new mongoose.Types.ObjectId(String(id))),
        },
      });
    }

    // Apply subcategory filter if subcategories are selected
    if (subcategories.length > 0) {
      finalCategoryConditions.push({
        subcategory: {
          $in: subcategories.map(
            (id) => new mongoose.Types.ObjectId(String(id))
          ),
        },
      });
    }

    // CORRECTED: Apply the final category conditions
    if (finalCategoryConditions.length > 0) {
      // If we have multiple conditions, use AND logic to ensure both are satisfied
      if (finalCategoryConditions.length > 1) {
        productFilter.$and = productFilter.$and || [];
        productFilter.$and.push(...finalCategoryConditions);
      } else {
        // If only one condition, apply it directly
        Object.assign(productFilter, finalCategoryConditions[0]);
      }
    }

    // Filter products without variants by price and discount
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
      const discountExpr = {
        $expr: {
          $and: [
            {
              $gte: [
                {
                  $multiply: [
                    {
                      $divide: [
                        { $subtract: ["$mrpPrice", "$landingSellPrice"] },
                        "$mrpPrice",
                      ],
                    },
                    100,
                  ],
                },
                minDiscount,
              ],
            },
            {
              $lte: [
                {
                  $multiply: [
                    {
                      $divide: [
                        { $subtract: ["$mrpPrice", "$landingSellPrice"] },
                        "$mrpPrice",
                      ],
                    },
                    100,
                  ],
                },
                maxDiscount,
              ],
            },
          ],
        },
      };

      productFilter.$or = [
        {
          hasVariant: false,
          ...discountExpr,
        },
        {
          _id: {
            $in: filteredProductIdsFromVariants.map(
              (id) => new mongoose.Types.ObjectId(id)
            ),
          },
        },
      ];
    }

    // Fetch filtered products with proper population
    const products = await Product.find(productFilter)
      .select(
        "_id productName brand category subcategory urlSlug productStatus visibility hasVariant sellingPrice defaultVariant productImages mrpPrice SKU barcode costPrice discountPercent taxRate landingSellPrice"
      )
      .populate("brand", "_id brandName imageUrl")
      .populate("category", "_id name image")
      .populate("subcategory", "_id name image")
      .sort({ sellingPrice: 1 })
      .lean();

    // MODIFIED: Enrich products with default variants
    const enrichedProducts = await enrichProductsWithDefaultVariants(products);

    // MODIFIED: Build products array with variants grouped under parent products
    const productsWithVariants = [];
    const variantsByProductId = filteredVariants.reduce((acc, v) => {
      const pid = v.productId.toString();
      if (!acc[pid]) acc[pid] = [];
      acc[pid].push(v);
      return acc;
    }, {});

    for (const product of enrichedProducts) {
      if (product.hasVariant) {
        // Get matching variants for this product
        const matchingVariants =
          variantsByProductId[product._id.toString()] || [];

        // Create product with variants array
        const productWithVariants = {
          _id: product._id,
          type: "product",
          productName: product.productName,
          brand: product.brand,
          category: product.category,
          subcategory: product.subcategory,
          urlSlug: product.urlSlug,
          productStatus: product.productStatus,
          hasVariant: true,
          variants: matchingVariants.map((variant) => ({
            _id: variant._id,
            variantId: variant.variantId,
            variantAttributes: variant.variantAttributes,
            SKU: variant.SKU,
            barcode: variant.barcode,
            productImages:
              variant.images && variant.images.length
                ? variant.images
                : product.productImages,
            costPrice: variant.costPrice,
            sellingPrice: variant.sellingPrice,
            mrpPrice: variant.mrpPrice,
            landingSellPrice: variant.landingSellPrice,
            discountPercent: variant.discountPercent,
            taxRate: variant.taxRate,
            isDefault: variant.isDefault,
          })),
          // Include product-level fields for easy access
          productImages: product.productImages,
          minSellingPrice:
            matchingVariants.length > 0
              ? Math.min(...matchingVariants.map((v) => v.sellingPrice))
              : product.sellingPrice,
          maxSellingPrice:
            matchingVariants.length > 0
              ? Math.max(...matchingVariants.map((v) => v.sellingPrice))
              : product.sellingPrice,
          variantCount: matchingVariants.length,
          // Include default variant data
          defaultVariant: product.defaultVariant,
          sellingPrice: product.sellingPrice,
          mrpPrice: product.mrpPrice,
          landingSellPrice: product.landingSellPrice,
          discountPercent: product.discountPercent,
          taxRate: product.taxRate,
        };

        productsWithVariants.push(productWithVariants);
      } else {
        // Add product without variant (already enriched with default variant data)
        productsWithVariants.push({
          _id: product._id,
          type: "product",
          productName: product.productName,
          brand: product.brand,
          category: product.category,
          subcategory: product.subcategory,
          urlSlug: product.urlSlug,
          productStatus: product.productStatus,
          hasVariant: false,
          SKU: product.SKU,
          barcode: product.barcode,
          productImages: product.productImages,
          costPrice: product.costPrice,
          sellingPrice: product.sellingPrice,
          mrpPrice: product.mrpPrice,
          landingSellPrice: product.landingSellPrice,
          discountPercent: product.discountPercent,
          taxRate: product.taxRate,
          defaultVariant: product.defaultVariant,
          variants: [], // Empty variants array for consistency
        });
      }
    }

    // MODIFIED: Filter options should only show available options based on current selection
    // Get available brands from filtered products
    const availableBrandIds = [
      ...new Set(productsWithVariants.map((p) => p.brand._id.toString())),
    ];
    const availableBrands = await Brand.find({
      _id: { $in: availableBrandIds },
      status: "active",
    }).select("_id brandName imageUrl");

    // Get available categories and subcategories from filtered products
    const availableCategoryIds = [
      ...new Set(
        productsWithVariants.map((p) =>
          p.category._id ? p.category._id.toString() : p.category.toString()
        )
      ),
    ];

    const availableSubcategoryIds = [
      ...new Set(
        productsWithVariants
          .filter((p) => p.subcategory)
          .map((p) =>
            p.subcategory._id
              ? p.subcategory._id.toString()
              : p.subcategory.toString()
          )
      ),
    ];

    const availableCategories = await Category.find({
      _id: { $in: availableCategoryIds },
      status: "active",
    }).select("_id name image type parentId");

    // Get all subcategories for the available main categories
    const mainCategories = availableCategories.filter(
      (cat) => cat.type === "Main"
    );
    const mainCategoryIds = mainCategories.map((cat) => cat._id);

    const allSubcategories = await Category.find({
      $or: [
        { parentId: { $in: mainCategoryIds } },
        { _id: { $in: availableSubcategoryIds } },
      ],
      status: "active",
    }).select("_id name image parentId type");

    // Create the subcategories response
    const subcategoriesResponse = {
      subcategories: allSubcategories.map((subcat) => ({
        _id: subcat._id,
        name: subcat.name,
        image: subcat.image,
        parentId: subcat.parentId,
        type: subcat.type,
      })),
    };

    // CORRECTED: Aggregate price and discount ranges from FILTERED products
    const productPriceRange = await Product.aggregate([
      {
        $match: {
          _id: { $in: products.map((p) => p._id) },
          productStatus: status,
          sellingPrice: { $exists: true, $gt: 0 },
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

    const variantPriceRange = await Variant.aggregate([
      {
        $match: {
          productId: {
            $in: products.filter((p) => p.hasVariant).map((p) => p._id),
          },
          sellingPrice: { $exists: true, $gt: 0 },
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

    // Aggregate variant attributes for filter options from filtered products
    const variantAttributesAggregation = await Variant.aggregate([
      {
        $match: {
          productId: {
            $in: products.filter((p) => p.hasVariant).map((p) => p._id),
          },
        },
      },
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

    // === ADD INVENTORY AVAILABILITY ===

    for (const product of productsWithVariants) {
      if (product.hasVariant && product.variants.length > 0) {
        // For each variant, find total available quantity
        for (const variant of product.variants) {
          const totalStock = await inventory.aggregate([
            {
              $match: {
                product: new mongoose.Types.ObjectId(product._id),
                variant: new mongoose.Types.ObjectId(variant._id),
              },
            },
            {
              $group: {
                _id: null,
                totalAvailableQuantity: { $sum: "$AvailableQuantity" },
              },
            },
          ]);

          variant.totalAvailableQuantity =
            totalStock[0]?.totalAvailableQuantity || 0;
        }

        // Product-level total = sum of its variants
        product.totalAvailableQuantity = product.variants.reduce(
          (sum, v) => sum + (v.totalAvailableQuantity || 0),
          0
        );
      } else {
        // Non-variant product
        const totalStock = await inventory.aggregate([
          {
            $match: {
              product: new mongoose.Types.ObjectId(product._id),
            },
          },
          {
            $group: {
              _id: null,
              totalAvailableQuantity: { $sum: "$AvailableQuantity" },
            },
          },
        ]);

        product.totalAvailableQuantity =
          totalStock[0]?.totalAvailableQuantity || 0;
      }
    }

    const variantFilters = {};
    variantAttributesAggregation.forEach((attr) => {
      variantFilters[attr._id] = attr.values
        .filter((v) => v != null && v !== "")
        .sort();
    });

    res.status(200).json({
      products: productsWithVariants, // MODIFIED: Use productsWithVariants instead of flatProducts
      filterOptions: {
        variantAttributes: variantFilters,
        brands: availableBrands,
        categories: availableCategories.filter((cat) => cat.type === "Main"),
        subcategories: subcategoriesResponse,
        priceRange: { min: minPriceFinal, max: maxPriceFinal },
        discountRange: { min: minDiscountFinal, max: maxDiscountFinal },
      },
      selectedFilters: {
        filters,
        brands,
        categories,
        subcategories,
        priceRange: { min: minPrice ?? 0, max: maxPrice ?? maxPriceFinal },
        discountRange: {
          min: minDiscount ?? 0,
          max: maxDiscount ?? maxDiscountFinal,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching filtered products:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMostWantedProducts = async (req, res) => {
  try {
    // Fetch products marked as "most wanted" (adjust query if you use a flag/field)
    let products = await Product.find({ isMostWanted: true })
      .populate("variants") // populate all variants
      .populate("defaultVariant") // populate defaultVariant
      .lean(); // faster + cleaner plain JS objects

    // Validate and fix defaultVariant for each product
    products = products.map((product) => {
      // Extract variant IDs for easy comparison
      const variantIds = product.variants.map((v) => v._id.toString());
      const defaultVariantId = product.defaultVariant?._id?.toString() || product.defaultVariant?.toString();

      // If defaultVariant is missing or invalid, set to first variant
      if (!variantIds.includes(defaultVariantId)) {
        if (product.variants.length > 0) {
          product.defaultVariant = product.variants[0];
        } else {
          product.defaultVariant = null; // no variants available
        }
      }

      return {
        ...product,
        defaultVariantId: product.defaultVariant?._id || null, // convenience field for frontend
      };
    });

    return res.status(200).json({
      success: true,
      message: "Most wanted products fetched successfully",
      data: products,
    });
  } catch (error) {
    console.error("Error fetching most wanted products:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch most wanted products",
      error: error.message,
    });
  }
};

export const getNewArrivalProducts = async (req, res) => {
  try {
    // Fetch products marked as new arrivals
    // (Adjust query based on how you mark them — by flag or createdAt)
    let products = await Product.find({ isNewArrival: true })
      .sort({ createdAt: -1 }) // newest first
      .populate("variants")
      .populate("defaultVariant")
      .lean();

    // Validate and fix defaultVariant for each product
    products = products.map((product) => {
      const variantIds = product.variants.map((v) => v._id.toString());
      const defaultVariantId =
        product.defaultVariant?._id?.toString() ||
        product.defaultVariant?.toString();

      // Ensure valid defaultVariant
      if (!variantIds.includes(defaultVariantId)) {
        if (product.variants.length > 0) {
          product.defaultVariant = product.variants[0];
        } else {
          product.defaultVariant = null;
        }
      }

      return {
        ...product,
        defaultVariantId: product.defaultVariant?._id || null, // For frontend use
      };
    });

    return res.status(200).json({
      success: true,
      message: "New arrival products fetched successfully",
      data: products,
    });
  } catch (error) {
    console.error("Error fetching new arrival products:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch new arrival products",
      error: error.message,
    });
  }
};

export const getBestSellingProducts = async (req, res) => {
  try {
    const bestSellers = await Product.find({
      productStatus: "published",
      visibility: "visible",
    })
      .sort({ orderCount: -1 })
      .lean();
    const enrichedProducts = await enrichProductsWithDefaultVariants(
      bestSellers
    );

    // Aggregate review stats for all products
    const productIds = enrichedProducts.map((p) => p._id);

    const reviewStats = await Review.aggregate([
      { $match: { productId: { $in: productIds } } },
      {
        $group: {
          _id: "$productId",
          averageRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    const reviewStatsMap = new Map();
    reviewStats.forEach((stat) => {
      reviewStatsMap.set(stat._id.toString(), {
        averageRating: Number(stat.averageRating.toFixed(2)),
        reviewCount: stat.reviewCount,
      });
    });

    const productsWithReviews = enrichedProducts.map((product) => {
      const review = reviewStatsMap.get(product._id.toString()) || {
        averageRating: 0,
        reviewCount: 0,
      };
      return {
        ...product,
        averageRating: review.averageRating,
        reviewCount: review.reviewCount,
      };
    });

    res.status(200).json(productsWithReviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching best sellers" });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({ urlSlug: req.params.slug }).lean();
    if (!product) return res.status(404).json({ message: "Product not found" });

    let variants = [];

    // === Fetch variants if applicable ===
    if (product.hasVariant) {
      variants = await Variant.find({ productId: product._id }).lean();

      // Add totalAvailableQuantity for each variant
      for (const variant of variants) {
        const stockAgg = await inventory.aggregate([
          {
            $match: {
              product: new mongoose.Types.ObjectId(product._id),
              variant: new mongoose.Types.ObjectId(variant._id),
            },
          },
          {
            $group: {
              _id: null,
              totalAvailableQuantity: { $sum: "$AvailableQuantity" },
            },
          },
        ]);

        variant.totalAvailableQuantity =
          stockAgg[0]?.totalAvailableQuantity || 0;
      }

      // Compute totalAvailableQuantity for product (sum of all variants)
      product.totalAvailableQuantity = variants.reduce(
        (sum, v) => sum + (v.totalAvailableQuantity || 0),
        0
      );
    } else {
      // === Non-variant product — sum directly from inventory ===
      const stockAgg = await inventory.aggregate([
        {
          $match: {
            product: new mongoose.Types.ObjectId(product._id),
          },
        },
        {
          $group: {
            _id: null,
            totalAvailableQuantity: { $sum: "$AvailableQuantity" },
          },
        },
      ]);

      product.totalAvailableQuantity = stockAgg[0]?.totalAvailableQuantity || 0;
    }

    // === Aggregate reviews to calculate average rating and count ===
    const reviewStats = await Review.aggregate([
      { $match: { productId: product._id } },
      {
        $group: {
          _id: "$productId",
          averageRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    const averageRating = reviewStats.length ? reviewStats[0].averageRating : 0;
    const reviewCount = reviewStats.length ? reviewStats[0].reviewCount : 0;

    // === Final response ===
    res.status(200).json({
      ...product,
      variants,
      averageRating: Number(averageRating.toFixed(2)),
      reviewCount,
    });
  } catch (error) {
    console.error("Error fetching product details:", error);
    res.status(500).json({ message: "Server error fetching product details" });
  }
};

export const getProductSearchSuggestions = async (reg, res) => {
  try {
    const search = (reg.query.q || "").trim();
    if (!search) {
      return res.status(200).json([]);
    }

    const regex = new RegExp(search, "i");

    const results = await Product.find({
      productStatus: "published",
      visibility: "visible",
      $or: [
        { productName: regex },
        { sku: regex },
        { shortDescription: regex },
        { productDescription: regex },
      ],
    })
      .select(
        "productName sellingPrice thumbnail category urlSlug SKU productImages"
      )
      .limit(10)
      .lean();

    res.status(200).json(results);
  } catch (error) {
    console.error("Error feching search suggestions: ", error);
    res
      .status(500)
      .json({ message: "server error while fetching search results" });
  }
};

export const getSearchSuggestions = async (req, res) => {
  try {
    const search = (req.query.q || "").trim();
    if (!search) {
      return res.status(200).json({ products: [], categories: [], brands: [] });
    }

    const regex = new RegExp(search, "i");

    // Query products
    const productsPromise = Product.find({
      productStatus: "published",
      visibility: "visible",
      $or: [
        { productName: regex },
        { sku: regex },
        { shortDescription: regex },
        { productDescription: regex },
      ],
    })
      .select(
        "productName sellingPrice mrpPrice thumbnail category urlSlug SKU productImages"
      )
      .limit(10)
      .lean();

    // Query categories
    const categoriesPromise = Category.find({
      status: "active",
      name: regex,
    })
      .select("name description image type")
      .limit(10)
      .lean();

    // Query brands
    const brandsPromise = Brand.find({
      status: "active",
      brandName: regex,
    })
      .select("brandName tagline description imageUrl")
      .limit(10)
      .lean();

    // Await all queries in parallel
    const [products, categories, brands] = await Promise.all([
      productsPromise,
      categoriesPromise,
      brandsPromise,
    ]);
    const enrichedProducts = await enrichProductsWithDefaultVariants(products);

    // Return combined results categorized by entity type
    res.status(200).json({ enrichedProducts, categories, brands });
  } catch (error) {
    console.error("Error fetching search suggestions: ", error);
    res
      .status(500)
      .json({ message: "Server error while fetching search suggestions" });
  }
};

export const getProductsByCategory = async (req, res) => {
  const categories = await Category.find({}).lean();

  const result = await Promise.all(
    categories.map(async (category) => {
      const products = await Product.find({
        category: new mongoose.Types.ObjectId(category._id),
        productStatus: "published",
        visibility: "visible",
      })
        .populate("brand category")
        .lean();

      const enrichedProducts = products.map((product) => ({
        _id: product._id,
        name: product.productName,
        price: product.sellingPrice,
        variant: product.hasVariant
          ? "Has Variants"
          : product.defaultVariant?.name || "",
        image: product.productImages[0] || "",
      }));

      return {
        categoryId: category._id,
        categoryName: category.name,
        categoryImage: category.image,
        products: enrichedProducts,
      };
    })
  );

  res.status(200).json(result);
};
export const getNearbyProducts = async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;
    if (!lat || !lng) {
      return res
        .status(400)
        .json({ message: "Latitude and longitude are required" });
    }

    const radiusInMeters = radius * 1000; // Convert km to meters

    // Find warehouses near the location within radius
    const nearbyWarehouses = await Warehouse.find({
      location: {
        $geoWithin: {
          $centerSphere: [
            [parseFloat(lng), parseFloat(lat)], // lng, lat order
            radiusInMeters / 6378137, // Earth radius in meters to radians
          ],
        },
      },
      status: "Active",
    }).select("_id");

    const warehouseIds = nearbyWarehouses.map((w) => w._id);

    if (warehouseIds.length === 0) {
      return res.status(200).json({
        data: [],
        totalCount: 0,
      });
    }

    // Find all products linked to the nearby warehouses
    const productQuery = {
      warehouse: { $in: warehouseIds },
      productStatus: "published",
      visibility: "visible",
    };

    const products = await Product.find(productQuery)
      .populate("brand category")
      .lean();

    res.status(200).json({
      data: products,
      totalCount: products.length,
    });
  } catch (error) {
    console.error("Error fetching nearby products:", error);
    res.status(500).json({ message: "Server error fetching nearby products" });
  }
};

