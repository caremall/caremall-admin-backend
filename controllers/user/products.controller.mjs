import mongoose from "mongoose";
import Product from "../../models/Product.mjs";
import Variant from "../../models/Variant.mjs";
import Category from "../../models/Category.mjs";
import { enrichProductsWithDefaultVariants } from "../../utils/enrichedProducts.mjs";
import Warehouse from "../../models/Warehouse.mjs";
import Review from "../../models/Review.mjs";
import Brand from "../../models/Brand.mjs";
import inventory from "../../models/inventory.mjs";
import Offer from "../../models/offerManagement.mjs";


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
          landingSellPrice:product.landingSellPrice,
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
    const now = new Date();

    // === 1. Parse Filters ===
    const brands = req.query.brands
      ? Array.isArray(req.query.brands)
        ? req.query.brands
        : req.query.brands.split(",")
      : [];

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

    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;
    const minDiscount = req.query.minDiscount ? Number(req.query.minDiscount) : undefined;
    const maxDiscount = req.query.maxDiscount ? Number(req.query.maxDiscount) : undefined;
    const status = req.query.status || "published";

    const reservedFields = [
      "brands", "categories", "subcategories", "minPrice", "maxPrice",
      "minDiscount", "maxDiscount", "status", "page", "limit"
    ];

    const filters = {};
    Object.keys(req.query).forEach((key) => {
      if (!reservedFields.includes(key)) {
        filters[key] = req.query[key];
      }
    });

    // === 2. Build Product Match (Category/Brand) ===
    let productMatch = { productStatus: status, visibility: "visible" };

    if (brands.length > 0) {
      productMatch.brand = { $in: brands.map(id => new mongoose.Types.ObjectId(String(id))) };
    }

    const categoryConditions = [];
    if (categories.length > 0) {
      categoryConditions.push({
        category: { $in: categories.map(id => new mongoose.Types.ObjectId(String(id))) }
      });
    }
    if (subcategories.length > 0) {
      categoryConditions.push({
        subcategory: { $in: subcategories.map(id => new mongoose.Types.ObjectId(String(id))) }
      });
    }
    if (categoryConditions.length > 0) {
      productMatch.$or = categoryConditions;
    }

    const productIds = await Product.find(productMatch).distinct("_id");

    // === 3. Variant Attribute Filters ===
    const variantAttributeFilters = [];
    for (const [attrName, attrValues] of Object.entries(filters)) {
      const valuesArray = Array.isArray(attrValues) ? attrValues : attrValues.split(",");
      variantAttributeFilters.push({
        variantAttributes: {
          $elemMatch: {
            name: { $regex: `^${attrName}$`, $options: "i" },
            value: { $in: valuesArray }
          }
        }
      });
    }

    const variantMatch = { productId: { $in: productIds } };
    if (variantAttributeFilters.length > 0) {
      variantMatch.$and = variantAttributeFilters;
    }

    // === 4. Price & Discount Filters on Variants ===
    if (minPrice !== undefined || maxPrice !== undefined) {
      variantMatch.sellingPrice = {};
      if (minPrice !== undefined) variantMatch.sellingPrice.$gte = minPrice;
      if (maxPrice !== undefined) variantMatch.sellingPrice.$lte = maxPrice;
    }

    if (minDiscount !== undefined || maxDiscount !== undefined) {
      const discountConditions = [];
      if (minDiscount !== undefined) {
        discountConditions.push({
          $gte: [
            { $multiply: [{ $divide: [{ $subtract: ["$mrpPrice", "$landingSellPrice"] }, "$mrpPrice"] }, 100] },
            minDiscount
          ]
        });
      }
      if (maxDiscount !== undefined) {
        discountConditions.push({
          $lte: [
            { $multiply: [{ $divide: [{ $subtract: ["$mrpPrice", "$landingSellPrice"] }, "$mrpPrice"] }, 100] },
            maxDiscount
          ]
        });
      }
      variantMatch.$expr = { $and: discountConditions };
    }

    const filteredVariants = await Variant.find(variantMatch).lean();
    const filteredProductIdsFromVariants = [...new Set(filteredVariants.map(v => v.productId.toString()))];

    // === 5. Final Product Filter ===
    let productFilter = {
      productStatus: status,
      visibility: "visible",
      $or: [
        { hasVariant: false },
        { _id: { $in: filteredProductIdsFromVariants.map(id => new mongoose.Types.ObjectId(id)) } }
      ]
    };

    if (brands.length > 0) {
      productFilter.brand = { $in: brands.map(id => new mongoose.Types.ObjectId(String(id))) };
    }

    const finalCategoryConditions = [];
    if (categories.length > 0) {
      finalCategoryConditions.push({
        category: { $in: categories.map(id => new mongoose.Types.ObjectId(String(id))) }
      });
    }
    if (subcategories.length > 0) {
      finalCategoryConditions.push({
        subcategory: { $in: subcategories.map(id => new mongoose.Types.ObjectId(String(id))) }
      });
    }
    if (finalCategoryConditions.length > 0) {
      if (finalCategoryConditions.length > 1) {
        productFilter.$and = finalCategoryConditions;
      } else {
        Object.assign(productFilter, finalCategoryConditions[0]);
      }
    }

    // === 6. Fetch Products ===
    const products = await Product.find(productFilter)
      .select("_id productName brand category subcategory urlSlug hasVariant sellingPrice mrpPrice landingSellPrice productImages minimumQuantity maximumQuantity")
      .populate("brand", "_id brandName imageUrl")
      .populate("category", "_id name image")
      .populate("subcategory", "_id name image")
      .lean();

    // === 7. Enrich with Default Variants ===
    const enrichedProducts = await enrichProductsWithDefaultVariants(products);

    // === 8. Fetch Active Offers ===
    const offers = await Offer.find({
      offerStatus: "published",
      offerRedeemTimePeriod: { $exists: true, $not: { $size: 0 } },
      "offerRedeemTimePeriod.0": { $lte: now },
      "offerRedeemTimePeriod.1": { $gte: now },
    }).lean();

    // === 9. Helper: Apply Discount ===
    const applyDiscount = (price, unit, value) => {
      if (unit === "percentage") return Math.max(0, price - (price * value) / 100);
      if (unit === "fixed") return Math.max(0, price - value);
      return price;
    };

    // === 10. Process Each Product + Variants ===
    const productsWithVariants = [];
    const variantsByProductId = filteredVariants.reduce((acc, v) => {
      const pid = v.productId.toString();
      if (!acc[pid]) acc[pid] = [];
      acc[pid].push(v);
      return acc;
    }, {});

    for (const product of enrichedProducts) {
      let productTotalStock = 0;
      const processedVariants = [];

      if (product.hasVariant) {
        const matchingVariants = variantsByProductId[product._id.toString()] || [];

        for (const variant of matchingVariants) {
          let landingPrice = variant.landingSellPrice || 0;
          let sellingPrice = variant.sellingPrice || 0;
          let mrpPrice = variant.mrpPrice || 0;

          let basePrice = landingPrice > 0 ? landingPrice : sellingPrice;
          let isLandingPriceApplied = landingPrice > 0;

          if (basePrice <= 0) {
            basePrice = sellingPrice || 0;
            isLandingPriceApplied = false;
          }

          let discountedPrice = basePrice;
          let appliedOffers = [];

          const lineTotal = basePrice;

          // Apply offers - FIXED LOGIC
          for (const offer of offers) {
            let applies = false;

            if (offer.offerType === "product") {
              applies = offer.offerEligibleItems.includes(product._id.toString());
            } else if (offer.offerType === "category" && product.category) {
              applies = offer.offerEligibleItems.includes(product.category._id.toString());
            } else if (offer.offerType === "brand" && product.brand) {
              applies = offer.offerEligibleItems.includes(product.brand._id.toString());
            }

            if (applies && lineTotal >= (offer.offerMinimumOrderValue || 0)) {
              const oldPrice = discountedPrice;
              discountedPrice = applyDiscount(discountedPrice, offer.offerDiscountUnit, offer.offerDiscountValue);
              if (discountedPrice < oldPrice) {
                appliedOffers.push({
                  offerName: offer.offerName,
                  discountType: offer.offerDiscountUnit,
                  discountValue: offer.offerDiscountValue
                });
              }
            }
          }

          const finalPrice = Math.max(0, discountedPrice);
          const discountPercent = mrpPrice > 0 && landingPrice > 0
            ? Math.ceil(((mrpPrice - landingPrice) / mrpPrice) * 100)
            : mrpPrice > 0 && sellingPrice > 0
              ? Math.ceil(((mrpPrice - sellingPrice) / mrpPrice) * 100)
              : 0;

          // Stock
          const stockAgg = await mongoose.model("Inventory").aggregate([
            {
              $match: {
                product: new mongoose.Types.ObjectId(product._id),
                variant: new mongoose.Types.ObjectId(variant._id),
              },
            },
            { $group: { _id: null, totalAvailableQuantity: { $sum: "$quantity" } } },
          ]);

          const totalAvailableQuantity = stockAgg[0]?.totalAvailableQuantity || 0;
          productTotalStock += totalAvailableQuantity;

          const pricing = {
            originalPrice: basePrice,
            discountedPrice: finalPrice,
            totalPrice: finalPrice,
            sellingPrice,
            mrpPrice,
            landingSellPrice: landingPrice,
            discountPercent,
            isLandingPriceApplied,
            appliedOffers
          };

          processedVariants.push({
            _id: variant._id,
            variantId: variant.variantId,
            variantAttributes: variant.variantAttributes,
            SKU: variant.SKU,
            barcode: variant.barcode,
            productImages: variant.images && variant.images.length ? variant.images : product.productImages,
            costPrice: variant.costPrice,
            taxRate: variant.taxRate,
            isDefault: variant.isDefault,
            landingSellPrice: variant.landingSellPrice,
            pricing,
            offerPrice: finalPrice,  // offerPrice outside pricing
            stock: {
              availableQuantity: totalAvailableQuantity,
              maxAllowedQuantity: Math.min(variant.maximumQuantity || 10, totalAvailableQuantity),
              isInStock: totalAvailableQuantity > 0
            },
            totalAvailableQuantity
          });
        }

        // Default Variant Pricing - FIXED LOGIC
        const defaultVar = product.defaultVariant;
        let defaultPricing = null;
        let defaultOfferPrice = 0;
        let defaultStock = {};

        if (defaultVar) {
          // Find the processed variant that matches the default variant
          const defaultProcessedVariant = processedVariants.find(v =>
            v._id.toString() === defaultVar._id.toString()
          );

          if (defaultProcessedVariant) {
            defaultPricing = defaultProcessedVariant.pricing;
            defaultOfferPrice = defaultProcessedVariant.offerPrice;
            defaultStock = defaultProcessedVariant.stock;
          } else {
            // If default variant not in processed variants, calculate pricing separately
            let landingPrice = defaultVar.landingSellPrice || 0;
            let sellingPrice = defaultVar.sellingPrice || 0;
            let mrpPrice = defaultVar.mrpPrice || 0;

            let basePrice = landingPrice > 0 ? landingPrice : sellingPrice;
            let isLandingPriceApplied = landingPrice > 0;

            if (basePrice <= 0) {
              basePrice = sellingPrice || 0;
              isLandingPriceApplied = false;
            }

            let discountedPrice = basePrice;
            let appliedOffers = [];

            const lineTotal = basePrice;

            // Apply offers to default variant
            for (const offer of offers) {
              let applies = false;

              if (offer.offerType === "product") {
                applies = offer.offerEligibleItems.includes(product._id.toString());
              } else if (offer.offerType === "category" && product.category) {
                applies = offer.offerEligibleItems.includes(product.category._id.toString());
              } else if (offer.offerType === "brand" && product.brand) {
                applies = offer.offerEligibleItems.includes(product.brand._id.toString());
              }

              if (applies && lineTotal >= (offer.offerMinimumOrderValue || 0)) {
                const oldPrice = discountedPrice;
                discountedPrice = applyDiscount(discountedPrice, offer.offerDiscountUnit, offer.offerDiscountValue);
                if (discountedPrice < oldPrice) {
                  appliedOffers.push({
                    offerName: offer.offerName,
                    discountType: offer.offerDiscountUnit,
                    discountValue: offer.offerDiscountValue
                  });
                }
              }
            }

            const finalPrice = Math.max(0, discountedPrice);
            const discountPercent = mrpPrice > 0 && landingPrice > 0
              ? Math.ceil(((mrpPrice - landingPrice) / mrpPrice) * 100)
              : mrpPrice > 0 && sellingPrice > 0
                ? Math.ceil(((mrpPrice - sellingPrice) / mrpPrice) * 100)
                : 0;

            // Stock for default variant
            const defaultStockAgg = await mongoose.model("Inventory").aggregate([
              {
                $match: {
                  product: new mongoose.Types.ObjectId(product._id),
                  variant: new mongoose.Types.ObjectId(defaultVar._id),
                },
              },
              { $group: { _id: null, totalAvailableQuantity: { $sum: "$quantity" } } },
            ]);

            const defaultTotalAvailableQuantity = defaultStockAgg[0]?.totalAvailableQuantity || 0;

            defaultPricing = {
              originalPrice: basePrice,
              discountedPrice: finalPrice,
              totalPrice: finalPrice,
              sellingPrice,
              mrpPrice,
              landingSellPrice: landingPrice,
              discountPercent,
              isLandingPriceApplied,
              appliedOffers
            };

            defaultOfferPrice = finalPrice;
            defaultStock = {
              availableQuantity: defaultTotalAvailableQuantity,
              maxAllowedQuantity: Math.min(defaultVar.maximumQuantity || 10, defaultTotalAvailableQuantity),
              isInStock: defaultTotalAvailableQuantity > 0
            };
          }
        }

        productsWithVariants.push({
          _id: product._id,
          type: "product",
          productName: product.productName,
          brand: product.brand,
          category: product.category,
          subcategory: product.subcategory,
          urlSlug: product.urlSlug,
          productStatus: product.productStatus,
          hasVariant: true,
          landingSellPrice: product.landingSellPrice,
          productImages: product.productImages,
          variants: processedVariants,
          defaultVariant: product.defaultVariant ? {
            ...product.defaultVariant,
            pricing: defaultPricing,
            offerPrice: defaultOfferPrice,
            stock: defaultStock
          } : null,
          totalAvailableQuantity: productTotalStock,
          minSellingPrice: processedVariants.length ? Math.min(...processedVariants.map(v => v.pricing.sellingPrice)) : 0,
          maxSellingPrice: processedVariants.length ? Math.max(...processedVariants.map(v => v.pricing.sellingPrice)) : 0,
          variantCount: processedVariants.length
        });
      } else {
        // === NON-VARIANT PRODUCT ===
        let landingPrice = product.landingSellPrice || 0;
        let sellingPrice = product.sellingPrice || 0;
        let mrpPrice = product.mrpPrice || 0;

        let basePrice = landingPrice > 0 ? landingPrice : sellingPrice;
        let isLandingPriceApplied = landingPrice > 0;

        if (basePrice <= 0) {
          basePrice = sellingPrice || 0;
          isLandingPriceApplied = false;
        }

        let discountedPrice = basePrice;
        let appliedOffers = [];

        const lineTotal = basePrice;

        // Apply offers - FIXED LOGIC
        for (const offer of offers) {
          let applies = false;

          if (offer.offerType === "product") {
            applies = offer.offerEligibleItems.includes(product._id.toString());
          } else if (offer.offerType === "category" && product.category) {
            applies = offer.offerEligibleItems.includes(product.category._id.toString());
          } else if (offer.offerType === "brand" && product.brand) {
            applies = offer.offerEligibleItems.includes(product.brand._id.toString());
          }

          if (applies && lineTotal >= (offer.offerMinimumOrderValue || 0)) {
            const oldPrice = discountedPrice;
            discountedPrice = applyDiscount(discountedPrice, offer.offerDiscountUnit, offer.offerDiscountValue);
            if (discountedPrice < oldPrice) {
              appliedOffers.push({
                offerName: offer.offerName,
                discountType: offer.offerDiscountUnit,
                discountValue: offer.offerDiscountValue
              });
            }
          }
        }

        const finalPrice = Math.max(0, discountedPrice);
        const discountPercent = mrpPrice > 0 && landingPrice > 0
          ? Math.ceil(((mrpPrice - landingPrice) / mrpPrice) * 100)
          : mrpPrice > 0 && sellingPrice > 0
            ? Math.ceil(((mrpPrice - sellingPrice) / mrpPrice) * 100)
            : 0;

        const stockAgg = await mongoose.model("Inventory").aggregate([
          { $match: { product: new mongoose.Types.ObjectId(product._id) } },
          { $group: { _id: null, totalAvailableQuantity: { $sum: "$quantity" } } },
        ]);
        productTotalStock = stockAgg[0]?.totalAvailableQuantity || 0;

        const pricing = {
          originalPrice: basePrice,
          discountedPrice: finalPrice,
          totalPrice: finalPrice,
          sellingPrice,
          mrpPrice,
          landingSellPrice: landingPrice,
          discountPercent,
          isLandingPriceApplied,
          appliedOffers
        };

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
          productImages: product.productImages,
          landingSellPrice:product.landingSellPrice,
          totalAvailableQuantity: productTotalStock,
          pricing,
          offerPrice: finalPrice,  // offerPrice outside
          stock: {
            availableQuantity: productTotalStock,
            maxAllowedQuantity: Math.min(product.maximumQuantity || 10, productTotalStock),
            isInStock: productTotalStock > 0
          },
          variants: []
        });
      }
    }

    // === 11. Filter Options ===
    const availableBrandIds = [...new Set(productsWithVariants.map(p => p.brand._id.toString()))];
    const availableBrands = await Brand.find({ _id: { $in: availableBrandIds }, status: "active" })
      .select("_id brandName imageUrl");

    const availableCategoryIds = [...new Set(productsWithVariants.map(p => p.category._id.toString()))];
    const availableCategories = await Category.find({ _id: { $in: availableCategoryIds }, status: "active" })
      .select("_id name image type parentId");

    const mainCategoryIds = availableCategories.filter(c => c.type === "Main").map(c => c._id);
    const availableSubcategoryIds = [...new Set(productsWithVariants.filter(p => p.subcategory).map(p => p.subcategory._id.toString()))];
    const allSubcategories = await Category.find({
      $or: [
        { parentId: { $in: mainCategoryIds } },
        { _id: { $in: availableSubcategoryIds } }
      ],
      status: "active"
    }).select("_id name image parentId type");

    // === 12. Price & Discount Range (from offerPrice) ===
    const priceValues = productsWithVariants.flatMap(p =>
      p.hasVariant
        ? p.variants.map(v => v.offerPrice)
        : [p.offerPrice]
    ).filter(p => p > 0);

    const discountValues = productsWithVariants.flatMap(p =>
      p.hasVariant
        ? p.variants.map(v => v.pricing.discountPercent)
        : [p.pricing.discountPercent]
    );

    const minPriceFinal = priceValues.length ? Math.min(...priceValues) : 0;
    const maxPriceFinal = priceValues.length ? Math.max(...priceValues) : 0;
    const minDiscountFinal = discountValues.length ? Math.min(...discountValues) : 0;
    const maxDiscountFinal = discountValues.length ? Math.max(...discountValues) : 0;

    // === 13. Variant Attributes ===
    const variantAttrs = await Variant.aggregate([
      { $match: { productId: { $in: productsWithVariants.filter(p => p.hasVariant).map(p => p._id) } } },
      { $unwind: "$variantAttributes" },
      {
        $group: {
          _id: { name: "$variantAttributes.name", value: "$variantAttributes.value" }
        }
      },
      {
        $group: {
          _id: "$_id.name",
          values: { $addToSet: "$_id.value" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const variantFilters = {};
    variantAttrs.forEach(attr => {
      variantFilters[attr._id] = attr.values.filter(v => v).sort();
    });

    // === 14. Response ===
    res.status(200).json({
      products: productsWithVariants,
      filterOptions: {
        variantAttributes: variantFilters,
        brands: availableBrands,
        categories: availableCategories.filter(c => c.type === "Main"),
        subcategories: { subcategories: allSubcategories.map(s => ({ _id: s._id, name: s.name, image: s.image, parentId: s.parentId })) },
        priceRange: { min: minPriceFinal, max: maxPriceFinal },
        discountRange: { min: minDiscountFinal, max: maxDiscountFinal }
      },
      selectedFilters: {
        filters,
        brands,
        categories,
        subcategories,
        priceRange: { min: minPrice ?? 0, max: maxPrice ?? maxPriceFinal },
        discountRange: { min: minDiscount ?? 0, max: maxDiscount ?? maxDiscountFinal }
      }
    });

  } catch (error) {
    console.error("Error in getFilteredProductsUpdated:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMostWantedProducts = async (req, res) => {
  try {
    const now = new Date();

    // Step 1: Fetch published & visible products
    const products = await Product.find({
      productStatus: "published",
      visibility: "visible",
    }).lean();

    if (!products.length) {
      return res.status(200).json([]);
    }

    // Step 2: Enrich with default variants
    const enrichedProducts = await enrichProductsWithDefaultVariants(products);

    // Step 3: Fetch active offers
    const offers = await Offer.find({
      offerStatus: "published",
      offerRedeemTimePeriod: { $exists: true, $not: { $size: 0 } },
      "offerRedeemTimePeriod.0": { $lte: now },
      "offerRedeemTimePeriod.1": { $gte: now },
    }).lean();

    // Step 4: Review aggregation
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

    // Step 5: Discount helper
    const applyDiscount = (price, unit, value) => {
      if (unit === "percentage") {
        return Math.max(0, price - (price * value) / 100);
      } else if (unit === "fixed") {
        return Math.max(0, price - value);
      }
      return price;
    };

    // Step 6: Process each product
    const processedProducts = [];

    for (const product of enrichedProducts) {
      const review = reviewStatsMap.get(product._id.toString()) || {
        averageRating: 0,
        reviewCount: 0,
      };

      const orderCount = product.orderCount || 0;
      const addedToCartCount = product.addedToCartCount || 0;
      const wishlistCount = product.wishlistCount || 0;
      const viewsCount = product.viewsCount || 0;

      const mostWantedScore =
        orderCount * 3 +
        addedToCartCount * 2 +
        wishlistCount * 1 +
        viewsCount * 0.5;

      // === PRICING LOGIC ===
      let landingPrice = 0;
      let sellingPrice = 0;
      let mrpPrice = 0;
      let basePrice = 0;
      let discountedPrice = 0;
      let discountPercent = 0;
      let isLandingPriceApplied = false;
      let appliedOffers = [];
      let availableQuantity = 0;
      let maxAllowedQuantity = 0;
      let variantDetails = null;

      if (product.hasVariant && product.defaultVariant) {
        // === VARIANT CASE ===
        landingPrice = product.defaultVariant.landingSellPrice || 0;
        sellingPrice = product.defaultVariant.sellingPrice || 0;
        mrpPrice = product.defaultVariant.mrpPrice || 0;

        // Use landing price if > 0
        basePrice = landingPrice > 0 ? landingPrice : sellingPrice;
        isLandingPriceApplied = landingPrice > 0;

        // Inventory
        const inventory = await mongoose
          .model("Inventory")
          .findOne({ variant: product.defaultVariant._id })
          .lean();
        availableQuantity = inventory?.quantity || 0;
        maxAllowedQuantity = Math.min(
          product.defaultVariant.maximumQuantity || 10,
          availableQuantity
        );

        variantDetails = {
          _id: product.defaultVariant._id,
          variantAttributes: product.defaultVariant.variantAttributes || [],
          SKU: product.defaultVariant.SKU,
          barcode: product.defaultVariant.barcode,
          images: product.defaultVariant.images || [],
          isDefault: product.defaultVariant.isDefault || false,
        };
      } else {
        // === NON-VARIANT CASE ===
        landingPrice = product.landingSellPrice || 0;
        sellingPrice = product.sellingPrice || 0;
        mrpPrice = product.mrpPrice || 0;

        basePrice = landingPrice > 0 ? landingPrice : sellingPrice;
        isLandingPriceApplied = landingPrice > 0;

        // Inventory
        const inventory = await mongoose
          .model("Inventory")
          .findOne({ product: product._id, variant: { $exists: false } })
          .lean();
        availableQuantity = inventory?.quantity || 0;
        maxAllowedQuantity = Math.min(
          product.maximumQuantity || 10,
          availableQuantity
        );
      }

      // Fallback
      if (basePrice <= 0) {
        basePrice = sellingPrice || 0;
        isLandingPriceApplied = false;
      }

      // === Calculate discountPercent from MRP - landingSellPrice ===
      if (mrpPrice > 0 && landingPrice > 0) {
        discountPercent = Math.ceil(((mrpPrice - landingPrice) / mrpPrice) * 100);
      } else if (mrpPrice > 0 && sellingPrice > 0) {
        discountPercent = Math.ceil(((mrpPrice - sellingPrice) / mrpPrice) * 100);
      } else {
        discountPercent = 0;
      }

      // === Apply Offers ===
      let currentPrice = basePrice;
      const lineTotalBeforeDiscount = basePrice;

      for (const offer of offers) {
        let applies = false;

        if (offer.offerType === "product") {
          applies = offer.offerEligibleItems.includes(product._id.toString());
        } else if (offer.offerType === "category" && product.category) {
          applies = offer.offerEligibleItems.includes(product.category.toString());
        } else if (offer.offerType === "brand" && product.brand) {
          applies = offer.offerEligibleItems.includes(product.brand.toString());
        }

        if (
          applies &&
          lineTotalBeforeDiscount >= (offer.offerMinimumOrderValue || 0)
        ) {
          const oldPrice = currentPrice;
          currentPrice = applyDiscount(
            currentPrice,
            offer.offerDiscountUnit,
            offer.offerDiscountValue
          );

          if (currentPrice < oldPrice) {
            appliedOffers.push({
              offerName: offer.offerName,
              discountType: offer.offerDiscountUnit,
              discountValue: offer.offerDiscountValue,
            });
          }
        }
      }

      discountedPrice = Math.max(0, currentPrice);
      const finalPrice = discountedPrice;

      // === Final Product Object ===
      processedProducts.push({
        _id: product._id,
        productName: product.productName,
        urlSlug: product.urlSlug,
        productImages: product.productImages || [],
        thumbnail: product.thumbnail || (product.productImages?.[0] || ""),
        brand: product.brand,
        category: product.category,
        subcategory: product.subcategory,
        hasVariant: product.hasVariant,
        variant: variantDetails,
        variants: product.hasVariant ? [variantDetails].filter(Boolean) : [],
        averageRating: review.averageRating,
        reviewCount: review.reviewCount,
        landingSellPrice: product.landingSellPrice,
        mostWantedScore,
        pricing: {
          originalPrice: basePrice,
          discountedPrice: finalPrice,
          totalPrice: finalPrice,
          sellingPrice,
          mrpPrice,
          landingSellPrice: landingPrice,
          discountPercent,
          isLandingPriceApplied,
          appliedOffers,
        },
        offerPrice: finalPrice,
        stock: {
          availableQuantity,
          maxAllowedQuantity,
          isInStock: availableQuantity > 0,
        },
      });
    }

    // Step 7: Sort by score
    const sorted = processedProducts.sort(
      (a, b) => b.mostWantedScore - a.mostWantedScore
    );

    res.status(200).json(sorted);
  } catch (error) {
    console.error("Error fetching most wanted products:", error);
    res.status(500).json({ message: "Server error fetching most wanted products" });
  }
};

export const getNewArrivalProducts = async (req, res) => {
  try {
    const now = new Date();

    // Step 1: Fetch published & visible products, sorted by newest
    const products = await Product.find({
      productStatus: "published",
      visibility: "visible",
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!products.length) {
      return res.status(200).json([]);
    }

    // Step 2: Enrich with default variants
    const enrichedProducts = await enrichProductsWithDefaultVariants(products);

    // Step 3: Fetch active offers
    const offers = await Offer.find({
      offerStatus: "published",
      offerRedeemTimePeriod: { $exists: true, $not: { $size: 0 } },
      "offerRedeemTimePeriod.0": { $lte: now },
      "offerRedeemTimePeriod.1": { $gte: now },
    }).lean();

    // Step 4: Review aggregation
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

    // Step 5: Discount helper
    const applyDiscount = (price, unit, value) => {
      if (unit === "percentage") {
        return Math.max(0, price - (price * value) / 100);
      } else if (unit === "fixed") {
        return Math.max(0, price - value);
      }
      return price;
    };

    // Step 6: Process each product
    const processedProducts = [];

    for (const product of enrichedProducts) {
      const review = reviewStatsMap.get(product._id.toString()) || {
        averageRating: 0,
        reviewCount: 0,
      };

      // === PRICING LOGIC ===
      let landingPrice = 0;
      let sellingPrice = 0;
      let mrpPrice = 0;
      let basePrice = 0;
      let originalPrice = 0;
      let discountedPrice = 0;
      let discountPercent = 0;
      let isLandingPriceApplied = false;
      let appliedOffers = [];
      let availableQuantity = 0;
      let maxAllowedQuantity = 0;
      let variantDetails = null;

      if (product.hasVariant && product.defaultVariant) {
        // === VARIANT CASE ===
        landingPrice = product.defaultVariant.landingSellPrice || 0;
        sellingPrice = product.defaultVariant.sellingPrice || 0;
        mrpPrice = product.defaultVariant.mrpPrice || 0;

        basePrice = landingPrice > 0 ? landingPrice : sellingPrice;
        isLandingPriceApplied = landingPrice > 0;

        const inventory = await mongoose
          .model("Inventory")
          .findOne({ variant: product.defaultVariant._id })
          .lean();
        availableQuantity = inventory?.quantity || 0;
        maxAllowedQuantity = Math.min(
          product.defaultVariant.maximumQuantity || 10,
          availableQuantity
        );

        variantDetails = {
          _id: product.defaultVariant._id,
          variantAttributes: product.defaultVariant.variantAttributes || [],
          SKU: product.defaultVariant.SKU,
          images: product.defaultVariant.images || [],
          isDefault: product.defaultVariant.isDefault || false,
        };
      } else {
        // === NON-VARIANT CASE ===
        landingPrice = product.landingSellPrice || 0;
        sellingPrice = product.sellingPrice || 0;
        mrpPrice = product.mrpPrice || 0;

        basePrice = landingPrice > 0 ? landingPrice : sellingPrice;
        isLandingPriceApplied = landingPrice > 0;

        const inventory = await mongoose
          .model("Inventory")
          .findOne({ product: product._id, variant: { $exists: false } })
          .lean();
        availableQuantity = inventory?.quantity || 0;
        maxAllowedQuantity = Math.min(
          product.maximumQuantity || 10,
          availableQuantity
        );
      }

      // Fallback
      if (basePrice <= 0) {
        basePrice = sellingPrice || 0;
        isLandingPriceApplied = false;
      }

      originalPrice = basePrice;
      discountedPrice = basePrice;

      // === Calculate discountPercent from MRP - landingSellPrice ===
      if (mrpPrice > 0 && landingPrice > 0) {
        const discountAmount = mrpPrice - landingPrice;
        discountPercent = Math.ceil((discountAmount / mrpPrice) * 100);
      } else if (mrpPrice > 0 && sellingPrice > 0) {
        const discountAmount = mrpPrice - sellingPrice;
        discountPercent = Math.ceil((discountAmount / mrpPrice) * 100);
      } else {
        discountPercent = 0;
      }

      // === Apply Offers ===
      const lineTotalBeforeDiscount = basePrice * 1;

      for (const offer of offers) {
        let applies = false;

        if (offer.offerType === "product") {
          applies = offer.offerEligibleItems.includes(product._id.toString());
        } else if (offer.offerType === "category" && product.category) {
          applies = offer.offerEligibleItems.includes(product.category.toString());
        } else if (offer.offerType === "brand" && product.brand) {
          applies = offer.offerEligibleItems.includes(product.brand.toString());
        }

        if (
          applies &&
          lineTotalBeforeDiscount >= (offer.offerMinimumOrderValue || 0)
        ) {
          const oldPrice = discountedPrice;
          discountedPrice = applyDiscount(
            discountedPrice,
            offer.offerDiscountUnit,
            offer.offerDiscountValue
          );

          if (discountedPrice < oldPrice) {
            appliedOffers.push({
              offerName: offer.offerName,
              discountType: offer.offerDiscountUnit,
              discountValue: offer.offerDiscountValue,
            });
          }
        }
      }

      const finalPrice = Math.max(0, discountedPrice);
      const totalPrice = finalPrice;

      // === Final Product Object ===
      processedProducts.push({
        ...product,
        averageRating: review.averageRating,
        reviewCount: review.reviewCount,
        pricing: {
          originalPrice,
          discountedPrice: finalPrice,
          totalPrice,
          sellingPrice: product.hasVariant
            ? product.defaultVariant?.sellingPrice || 0
            : product.sellingPrice || 0,
          mrpPrice,
          landingSellPrice: landingPrice,
          discountPercent,
          isLandingPriceApplied,
          appliedOffers,
        },
        offerPrice: finalPrice,
        landingSellPrice: product.landingSellPrice,
        stock: {
          availableQuantity,
          maxAllowedQuantity,
          isInStock: availableQuantity > 0,
        },
        variant: variantDetails,
        hasVariant: !!variantDetails,
      });
    }

    res.status(200).json(processedProducts);
  } catch (error) {
    console.error("Error fetching new arrivals:", error);
    res
      .status(500)
      .json({ message: "Server error fetching new arrival products" });
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
  console.log('Fetching product with slug:', req.params.slug);
  try {
    const now = new Date();

    // 1. Fetch product with proper population
    const product = await Product.findOne({ urlSlug: req.params.slug })
      .populate("brand", "_id brandName imageUrl")
      .populate("category", "_id name image")
      .populate("subcategory", "_id name image")
      .lean();

    if (!product) return res.status(404).json({ message: "Product not found" });

    // 2. Enrich with default variant
    const enrichedProduct = await enrichProductsWithDefaultVariants([product]);
    const productWithDefault = enrichedProduct[0];

    // 3. Active offers
    const offers = await Offer.find({
      offerStatus: "published",
      offerRedeemTimePeriod: { $exists: true, $not: { $size: 0 } },
      "offerRedeemTimePeriod.0": { $lte: now },
      "offerRedeemTimePeriod.1": { $gte: now },
    }).lean();

    const applyDiscount = (price, unit, value) => {
      if (unit === "percentage") return Math.max(0, price - (price * value) / 100);
      if (unit === "fixed") return Math.max(0, price - value);
      return price;
    };

    // === DEFAULT VARIANT PRICING ===
    let defaultPricing = null;
    let defaultStock = { availableQuantity: 0, maxAllowedQuantity: 0, isInStock: false };
    let defaultOfferPrice = 0;

    if (productWithDefault.hasVariant && productWithDefault.defaultVariant) {
      const v = productWithDefault.defaultVariant;

      const landingPrice = v.landingSellPrice || 0;
      const sellingPrice = v.sellingPrice || 0;
      const mrpPrice = v.mrpPrice || 0;

      const basePrice = landingPrice > 0 ? landingPrice : sellingPrice;
      const isLandingPriceApplied = landingPrice > 0;

      let discountedPrice = basePrice;
      const appliedOffers = [];

      const lineTotal = basePrice;

      // FIXED: Proper ID comparison for brand and category offers
      for (const offer of offers) {
        let applies = false;

        if (offer.offerType === "product") {
          applies = offer.offerEligibleItems.includes(product._id.toString());
        } else if (offer.offerType === "category" && product.category) {
          applies = offer.offerEligibleItems.includes(product.category._id.toString());
        } else if (offer.offerType === "brand" && product.brand) {
          applies = offer.offerEligibleItems.includes(product.brand._id.toString());
        }

        if (applies && lineTotal >= (offer.offerMinimumOrderValue || 0)) {
          const old = discountedPrice;
          discountedPrice = applyDiscount(discountedPrice, offer.offerDiscountUnit, offer.offerDiscountValue);
          if (discountedPrice < old) {
            appliedOffers.push({
              offerName: offer.offerName,
              discountType: offer.offerDiscountUnit,
              discountValue: offer.offerDiscountValue
            });
          }
        }
      }

      const finalPrice = Math.max(0, discountedPrice);
      const discountPercent = mrpPrice > 0 && landingPrice > 0
        ? Math.ceil(((mrpPrice - landingPrice) / mrpPrice) * 100)
        : mrpPrice > 0 && sellingPrice > 0
          ? Math.ceil(((mrpPrice - sellingPrice) / mrpPrice) * 100)
          : 0;

      const inventory = await mongoose.model("Inventory").findOne({ variant: v._id }).lean();
      const availableQuantity = inventory?.quantity || 0;
      const maxAllowedQuantity = Math.min(v.maximumQuantity || 10, availableQuantity);

      defaultPricing = {
        originalPrice: basePrice,
        discountedPrice: finalPrice,
        totalPrice: finalPrice,
        sellingPrice,
        mrpPrice,
        landingSellPrice: landingPrice,
        discountPercent,
        isLandingPriceApplied,
        appliedOffers
      };

      defaultStock = {
        availableQuantity,
        maxAllowedQuantity,
        isInStock: availableQuantity > 0
      };
      defaultOfferPrice = finalPrice;
    }

    // === ALL VARIANTS ===
    let variants = [];
    let totalProductStock = 0;

    if (product.hasVariant) {
      variants = await Variant.find({ productId: product._id }).lean();

      for (const variant of variants) {
        const landingPrice = variant.landingSellPrice || 0;
        const sellingPrice = variant.sellingPrice || 0;
        const mrpPrice = variant.mrpPrice || 0;

        const basePrice = landingPrice > 0 ? landingPrice : sellingPrice;
        const isLandingPriceApplied = landingPrice > 0;

        let discountedPrice = basePrice;
        const appliedOffers = [];

        const lineTotal = basePrice;

        // FIXED: Proper ID comparison for brand and category offers
        for (const offer of offers) {
          let applies = false;

          if (offer.offerType === "product") {
            applies = offer.offerEligibleItems.includes(product._id.toString());
          } else if (offer.offerType === "category" && product.category) {
            applies = offer.offerEligibleItems.includes(product.category._id.toString());
          } else if (offer.offerType === "brand" && product.brand) {
            applies = offer.offerEligibleItems.includes(product.brand._id.toString());
          }

          if (applies && lineTotal >= (offer.offerMinimumOrderValue || 0)) {
            const old = discountedPrice;
            discountedPrice = applyDiscount(discountedPrice, offer.offerDiscountUnit, offer.offerDiscountValue);
            if (discountedPrice < old) {
              appliedOffers.push({
                offerName: offer.offerName,
                discountType: offer.offerDiscountUnit,
                discountValue: offer.offerDiscountValue
              });
            }
          }
        }

        const finalPrice = Math.max(0, discountedPrice);
        const discountPercent = mrpPrice > 0 && landingPrice > 0
          ? Math.ceil(((mrpPrice - landingPrice) / mrpPrice) * 100)
          : mrpPrice > 0 && sellingPrice > 0
            ? Math.ceil(((mrpPrice - sellingPrice) / mrpPrice) * 100)
            : 0;

        const stockAgg = await mongoose.model("Inventory").aggregate([
          {
            $match: {
              product: new mongoose.Types.ObjectId(product._id),
              variant: new mongoose.Types.ObjectId(variant._id)
            }
          },
          {
            $group: {
              _id: null,
              totalAvailableQuantity: { $sum: "$quantity" }
            }
          }
        ]);

        const totalAvailableQuantity = stockAgg[0]?.totalAvailableQuantity || 0;
        totalProductStock += totalAvailableQuantity;

        variant.pricing = {
          originalPrice: basePrice,
          discountedPrice: finalPrice,
          totalPrice: finalPrice,
          sellingPrice,
          mrpPrice,
          landingSellPrice: landingPrice,
          discountPercent,
          isLandingPriceApplied,
          appliedOffers
        };

        variant.stock = {
          availableQuantity: totalAvailableQuantity,
          maxAllowedQuantity: Math.min(variant.maximumQuantity || 10, totalAvailableQuantity),
          isInStock: totalAvailableQuantity > 0
        };

        variant.offerPrice = finalPrice;
        variant.totalAvailableQuantity = totalAvailableQuantity;
      }
    } else {
      const stockAgg = await mongoose.model("Inventory").aggregate([
        { $match: { product: new mongoose.Types.ObjectId(product._id) } },
        { $group: { _id: null, totalAvailableQuantity: { $sum: "$quantity" } } }
      ]);
      totalProductStock = stockAgg[0]?.totalAvailableQuantity || 0;
    }

    // === REVIEWS ===
    const reviewStats = await Review.aggregate([
      { $match: { productId: product._id } },
      {
        $group: {
          _id: "$productId",
          averageRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 }
        }
      }
    ]);

    const averageRating = reviewStats.length ? Number(reviewStats[0].averageRating.toFixed(2)) : 0;
    const reviewCount = reviewStats.length ? reviewStats[0].reviewCount : 0;

    // === NON-VARIANT PRICING (if not hasVariant) ===
    let nonVariantPricing = null;
    let nonVariantOfferPrice = 0;
    let nonVariantStock = { availableQuantity: 0, maxAllowedQuantity: 0, isInStock: false };

    if (!product.hasVariant) {
      const landingPrice = product.landingSellPrice || 0;
      const sellingPrice = product.sellingPrice || 0;
      const mrpPrice = product.mrpPrice || 0;

      const basePrice = landingPrice > 0 ? landingPrice : sellingPrice;
      const isLandingPriceApplied = landingPrice > 0;

      let discountedPrice = basePrice;
      const appliedOffers = [];

      const lineTotal = basePrice;

      // FIXED: Proper ID comparison for brand and category offers
      for (const offer of offers) {
        let applies = false;

        if (offer.offerType === "product") {
          applies = offer.offerEligibleItems.includes(product._id.toString());
        } else if (offer.offerType === "category" && product.category) {
          applies = offer.offerEligibleItems.includes(product.category._id.toString());
        } else if (offer.offerType === "brand" && product.brand) {
          applies = offer.offerEligibleItems.includes(product.brand._id.toString());
        }

        if (applies && lineTotal >= (offer.offerMinimumOrderValue || 0)) {
          const old = discountedPrice;
          discountedPrice = applyDiscount(discountedPrice, offer.offerDiscountUnit, offer.offerDiscountValue);
          if (discountedPrice < old) {
            appliedOffers.push({
              offerName: offer.offerName,
              discountType: offer.offerDiscountUnit,
              discountValue: offer.offerDiscountValue
            });
          }
        }
      }

      const finalPrice = Math.max(0, discountedPrice);
      const discountPercent = mrpPrice > 0 && landingPrice > 0
        ? Math.ceil(((mrpPrice - landingPrice) / mrpPrice) * 100)
        : mrpPrice > 0 && sellingPrice > 0
          ? Math.ceil(((mrpPrice - sellingPrice) / mrpPrice) * 100)
          : 0;

      nonVariantPricing = {
        originalPrice: basePrice,
        discountedPrice: finalPrice,
        totalPrice: finalPrice,
        sellingPrice,
        mrpPrice,
        landingSellPrice: landingPrice,
        discountPercent,
        isLandingPriceApplied,
        appliedOffers
      };

      nonVariantOfferPrice = finalPrice;
      nonVariantStock = {
        availableQuantity: totalProductStock,
        maxAllowedQuantity: Math.min(product.maximumQuantity || 10, totalProductStock),
        isInStock: totalProductStock > 0
      };
    }

    // === FINAL RESPONSE ===
    const response = {
      ...product,
      variants,
      totalAvailableQuantity: totalProductStock,
      averageRating,
      reviewCount,

      // ALWAYS RETURN pricing
      pricing: product.hasVariant ? defaultPricing : nonVariantPricing,

      // ALWAYS RETURN offerPrice
      offerPrice: product.hasVariant ? defaultOfferPrice : nonVariantOfferPrice,

      // ALWAYS RETURN stock for non-variant products
      stock: !product.hasVariant ? nonVariantStock : undefined,

      // defaultVariant with pricing + offerPrice
      defaultVariant: product.hasVariant ? {
        ...productWithDefault.defaultVariant,
        pricing: defaultPricing,
        stock: defaultStock,
        offerPrice: defaultOfferPrice
      } : null
    };

    res.status(200).json(response);

  } catch (error) {
    console.error("Error fetching product details:", error);
    res.status(500).json({ message: "Server error" });
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

// ─────────────────────────────────────────────────────────────────────────────
//  getSearchSuggestions – full pricing + variants + priority search
// ─────────────────────────────────────────────────────────────────────────────
export const getSearchSuggestions = async (req, res) => {
  try {
    const search = (req.query.q || "").trim();
    if (!search) {
      return res.status(200).json({ enrichedProducts: [], categories: [], brands: [] });
    }

    const now = new Date();

    // ---------- 1. Regex ----------
    const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escaped = escapeRegex(search);
    const startsWith = new RegExp('^' + escaped, 'i');
    const contains = new RegExp(escaped, 'i');

    // ---------- 2. Active Offers ----------
    const offers = await Offer.find({
      offerStatus: 'published',
      offerRedeemTimePeriod: { $exists: true, $not: { $size: 0 } },
      'offerRedeemTimePeriod.0': { $lte: now },
      'offerRedeemTimePeriod.1': { $gte: now },
    }).lean();

    const applyDiscount = (price, unit, value) => {
      if (unit === 'percentage') return Math.max(0, price - (price * value) / 100);
      if (unit === 'fixed') return Math.max(0, price - value);
      return price;
    };

    // ---------- 3. Priority Search ----------
    const prioritizeMatches = async (Model, fields, selectFields, limit = 10) => {
      const startsQuery = { $or: fields.map(f => ({ [f]: startsWith })) };
      const containsQuery = { $or: fields.map(f => ({ [f]: contains })) };

      if (Model.collection.name === 'products') {
        Object.assign(startsQuery, { productStatus: 'published', visibility: 'visible' });
        Object.assign(containsQuery, { productStatus: 'published', visibility: 'visible' });
      } else if (Model.collection.name === 'categories') {
        Object.assign(startsQuery, { status: 'active' });
        Object.assign(containsQuery, { status: 'active' });
      } else if (Model.collection.name === 'brands') {
        Object.assign(startsQuery, { status: 'active' });
        Object.assign(containsQuery, { status: 'active' });
      }

      const starts = await Model.find(startsQuery).select(selectFields).limit(limit).lean();
      const startsIds = starts.map(d => d._id.toString());

      const remain = limit - starts.length;
      const more = remain > 0
        ? await Model.find({
          ...containsQuery,
          _id: { $nin: startsIds.map(id => new mongoose.Types.ObjectId(id)) },
        })
          .select(selectFields)
          .limit(remain)
          .lean()
        : [];

      return [...starts, ...more];
    };

    // ---------- 4. Search Products ----------
    const rawProducts = await prioritizeMatches(
      Product,
      ['productName', 'SKU', 'shortDescription', 'productDescription'],
      '_id productName sellingPrice mrpPrice landingSellPrice thumbnail category urlSlug SKU productImages hasVariant defaultVariant maximumQuantity brand',
      10
    );

    // ---------- 5. Enrich with default variant ----------
    const enrichedProducts = await enrichProductsWithDefaultVariants(rawProducts);

    // ---------- 6. Load ALL variants (MUST include productId) ----------
    const productIds = enrichedProducts.map(p => p._id);
    const allVariants = await Variant.find({ productId: { $in: productIds } })
      .select(
        'productId _id variantId variantAttributes SKU barcode images landingSellPrice sellingPrice mrpPrice maximumQuantity isDefault'
      )  // productId is REQUIRED
      .lean();

    // ---------- 7. Group variants by product ----------
    const variantMap = {};
    allVariants.forEach(v => {
      const pid = v.productId?.toString();  // Safe access
      if (!pid) return;  // Skip malformed variants
      if (!variantMap[pid]) variantMap[pid] = [];
      variantMap[pid].push(v);
    });

    // ---------- 8. Build final products ----------
    const finalProducts = [];

    for (const product of enrichedProducts) {
      const pid = product._id.toString();
      const variants = variantMap[pid] || [];

      // Default variant
      let defaultVar = null;
      if (product.hasVariant && product.defaultVariant) {
        const defId = product.defaultVariant.toString();
        defaultVar = variants.find(v => v._id.toString() === defId) || null;
      }

      // Images fallback
      const finalImages = product.productImages?.length
        ? product.productImages
        : (defaultVar?.images || []);

      // Base price source
      const getBase = (src) => {
        const landing = src?.landingSellPrice || 0;
        const selling = src?.sellingPrice || 0;
        const mrp = src?.mrpPrice || 0;
        const maxQty = src?.maximumQuantity || 10;
        return { landing, selling, mrp, maxQty, base: landing > 0 ? landing : selling };
      };

      const defSrc = defaultVar ? getBase(defaultVar) : getBase(product);
      const basePrice = defSrc.base;
      const isLanding = defSrc.landing > 0;

      // Apply offers
      let discounted = basePrice;
      const applied = [];
      for (const o of offers) {
        let ok = false;
        if (o.offerType === 'product') ok = o.offerEligibleItems.includes(pid);
        else if (o.offerType === 'category' && product.category)
          ok = o.offerEligibleItems.includes(product.category.toString());
        else if (o.offerType === 'brand' && product.brand)
          ok = o.offerEligibleItems.includes(product.brand.toString());

        if (ok && basePrice >= (o.offerMinimumOrderValue || 0)) {
          const prev = discounted;
          discounted = applyDiscount(discounted, o.offerDiscountUnit, o.offerDiscountValue);
          if (discounted < prev) {
            applied.push({ offerName: o.offerName, discountType: o.offerDiscountUnit, discountValue: o.offerDiscountValue });
          }
        }
      }

      const finalPrice = Math.max(0, discounted);
      const discountPercent = defSrc.mrp > 0 && defSrc.landing > 0
        ? Math.ceil(((defSrc.mrp - defSrc.landing) / defSrc.mrp) * 100)
        : defSrc.mrp > 0 && defSrc.selling > 0
          ? Math.ceil(((defSrc.mrp - defSrc.selling) / defSrc.mrp) * 100)
          : 0;

      // Stock
      let available = 0;
      if (defaultVar) {
        const inv = await mongoose.model('Inventory').findOne({ variant: defaultVar._id }).lean();
        available = inv?.quantity || 0;
      } else {
        const agg = await mongoose.model('Inventory').aggregate([
          { $match: { product: product._id } },
          { $group: { _id: null, total: { $sum: '$quantity' } } },
        ]);
        available = agg[0]?.total || 0;
      }
      const maxAllowed = Math.min(defSrc.maxQty, available);

      const pricing = {
        originalPrice: basePrice,
        discountedPrice: finalPrice,
        totalPrice: finalPrice,
        sellingPrice: defSrc.selling,
        mrpPrice: defSrc.mrp,
        landingSellPrice: defSrc.landing,
        discountPercent,
        isLandingPriceApplied: isLanding,
        appliedOffers: applied,
      };

      // Process variants
      const processedVariants = variants.map(v => {
        const src = getBase(v);
        let vDisc = src.base;
        const vApplied = [];

        for (const o of offers) {
          let ok = false;
          if (o.offerType === 'product') ok = o.offerEligibleItems.includes(pid);
          else if (o.offerType === 'category' && product.category)
            ok = o.offerEligibleItems.includes(product.category.toString());
          else if (o.offerType === 'brand' && product.brand)
            ok = o.offerEligibleItems.includes(product.brand.toString());

          if (ok && src.base >= (o.offerMinimumOrderValue || 0)) {
            const prev = vDisc;
            vDisc = applyDiscount(vDisc, o.offerDiscountUnit, o.offerDiscountValue);
            if (vDisc < prev) {
              vApplied.push({ offerName: o.offerName, discountType: o.offerDiscountUnit, discountValue: o.offerDiscountValue });
            }
          }
        }

        const vFinal = Math.max(0, vDisc);
        const vPct = src.mrp > 0 && src.landing > 0
          ? Math.ceil(((src.mrp - src.landing) / src.mrp) * 100)
          : src.mrp > 0 && src.selling > 0
            ? Math.ceil(((src.mrp - src.selling) / src.mrp) * 100)
            : 0;

        // Variant stock
        let vStock = 0;
        (async () => {
          const inv = await mongoose.model('Inventory').findOne({ variant: v._id }).lean();
          vStock = inv?.quantity || 0;
        })();

        return {
          _id: v._id,
          variantId: v.variantId,
          variantAttributes: v.variantAttributes,
          SKU: v.SKU,
          images: v.images || [],
          pricing: {
            originalPrice: src.base,
            discountedPrice: vFinal,
            totalPrice: vFinal,
            sellingPrice: src.selling,
            mrpPrice: src.mrp,
            landingSellPrice: src.landing,
            discountPercent: vPct,
            isLandingPriceApplied: src.landing > 0,
            appliedOffers: vApplied,
          },
          offerPrice: vFinal,
          stock: {
            availableQuantity: vStock,
            maxAllowedQuantity: Math.min(v.maximumQuantity || 10, vStock),
            isInStock: vStock > 0,
          },
          isDefault: v.isDefault,
        };
      });

      finalProducts.push({
        _id: product._id,
        productName: product.productName,
        urlSlug: product.urlSlug,
        thumbnail: product.thumbnail || finalImages[0] || '',
        productImages: finalImages,
        SKU: product.SKU,
        brand: product.brand,
        category: product.category,
        hasVariant: product.hasVariant,
        variants: processedVariants,
        defaultVariant: defaultVar ? {
          _id: defaultVar._id,
          variantAttributes: defaultVar.variantAttributes,
          images: defaultVar.images,
          pricing,
          offerPrice: finalPrice,
          stock: { availableQuantity: available, maxAllowedQuantity: maxAllowed, isInStock: available > 0 },
        } : null,
        pricing,
        offerPrice: finalPrice,
        stock: { availableQuantity: available, maxAllowedQuantity: maxAllowed, isInStock: available > 0 },
      });
    }

    // ---------- 9. Categories & Brands ----------
    const [categories, brands] = await Promise.all([
      prioritizeMatches(Category, ['name'], 'name description image type', 5),
      prioritizeMatches(Brand, ['brandName'], 'brandName tagline description imageUrl', 5),
    ]);

    res.status(200).json({
      enrichedProducts: finalProducts,
      categories,
      brands,
    });

  } catch (err) {
    console.error('getSearchSuggestions error:', err);
    res.status(500).json({ message: 'Server error' });
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

