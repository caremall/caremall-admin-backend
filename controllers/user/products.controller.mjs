import mongoose from "mongoose";
import Product from "../../models/Product.mjs";
import Variant from "../../models/Variant.mjs";
import Category from "../../models/Category.mjs";
import { enrichProductsWithDefaultVariants } from "../../utils/enrichedProducts.mjs";
import Warehouse from "../../models/Warehouse.mjs";
import Review from "../../models/Review.mjs";
import Brand from "../../models/Brand.mjs";

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

    // Parse variant attribute filters
    let filters = req.query.filters;
    if (filters && typeof filters === "string") {
      try {
        filters = JSON.parse(filters);
      } catch {
        filters = {};
      }
    }
    filters = filters || {};

    // 1. Find all product IDs matching productStatus and brands filter (if any)
    let productMatch = { productStatus: status };
    if (brands.length > 0) {
      productMatch.brand = {
        $in: brands.map((id) => new mongoose.Types.ObjectId(String(id))),
      };
    }

    const productIds = await Product.find(productMatch).distinct("_id");

    // 2. Build variant attribute filters dynamically
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

    // 3. Query variants matching variant attribute filters & price/discount if set
    const variantMatch = { productId: { $in: productIds } };
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

    // 4. Collect product IDs from filtered variants
    const filteredProductIdsFromVariants = [
      ...new Set(filteredVariants.map((v) => v.productId.toString())),
    ];

    // 5. Build product filters for products without variants or with matching variants
    let productFilter = {
      productStatus: status,
      $or: [
        { hasVariant: false },
        { _id: { $in: filteredProductIdsFromVariants } },
      ],
    };

    if (brands.length > 0) {
      productFilter.brand = {
        $in: brands.map((id) => new mongoose.Types.ObjectId(String(id))),
      };
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

    // 6. Fetch filtered products
    const products = await Product.find(productFilter)
      .select(
        "_id productName brand category urlSlug productStatus hasVariant sellingPrice defaultVariant productImages"
      )
      .populate("brand", "_id brandName imageUrl")
      .sort({ sellingPrice: 1 });

    // 7. Aggregate variant attributes for filter options (all variants in filtered products)
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

    // 8. Aggregate price and discount ranges from products and variants for filter UI
    const productPriceRange = await Product.aggregate([
      {
        $match: {
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

    // 9. Get all brands for filter dropdown based on filtered products
    const availableBrandIds = products.map((p) => p.brand._id);
    const availableBrands = await Brand.find({
      _id: { $in: availableBrandIds },
      status: "active",
    }).select("_id brandName imageUrl");

    // 10. Return filtered products and filter options
    res.status(200).json({
      products,
      filterOptions: {
        variantAttributes: variantFilters,
        brands: availableBrands,
        priceRange: { min: minPriceFinal, max: maxPriceFinal },
        discountRange: { min: minDiscountFinal, max: maxDiscountFinal },
      },
      selectedFilters: {
        filters,
        brands,
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
    const products = await Product.find().lean();

    // Enrich products with default variant data
    const enrichedProducts = await enrichProductsWithDefaultVariants(products);

    // Aggregate review stats for all products in one go
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

    // Create a map for quick lookup of review stats by product ID
    const reviewStatsMap = new Map();
    reviewStats.forEach((stat) => {
      reviewStatsMap.set(stat._id.toString(), {
        averageRating: Number(stat.averageRating.toFixed(2)),
        reviewCount: stat.reviewCount,
      });
    });

    // Map review stats and calculate mostWantedScore per product
    const scoredProducts = enrichedProducts.map((product) => {
      const review = reviewStatsMap.get(product._id.toString()) || {
        averageRating: 0,
        reviewCount: 0,
      };

      const orderCount = product.orderCount || 0;
      const addedToCartCount = product.addedToCartCount || 0;
      const wishlistCount = product.wishlistCount || 0;
      const viewsCount = product.viewsCount || 0;

      const score =
        orderCount * 3 +
        addedToCartCount * 2 +
        wishlistCount * 1 +
        viewsCount * 0.5;

      return {
        ...product,
        averageRating: review.averageRating,
        reviewCount: review.reviewCount,
        mostWantedScore: score,
      };
    });

    // Sort by mostWantedScore descending, no limit
    const sorted = scoredProducts.sort(
      (a, b) => b.mostWantedScore - a.mostWantedScore
    );

    res.status(200).json(sorted);
  } catch (error) {
    console.error("Error fetching most wanted products:", error);
    res
      .status(500)
      .json({ message: "Server error fetching most wanted products" });
  }
};

export const getNewArrivalProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 }).lean();
    const enrichedProducts = await enrichProductsWithDefaultVariants(products);

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
    console.error("Error fetching new arrivals:", error);
    res
      .status(500)
      .json({ message: "Server error fetching new arrival products" });
  }
};

export const getBestSellingProducts = async (req, res) => {
  try {
    const bestSellers = await Product.find().sort({ orderCount: -1 }).lean();
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

    // Fetch variants if present
    let variants = [];
    if (product.hasVariant) {
      variants = await Variant.find({ productId: product._id }).lean();
    }

    // Aggregate reviews to calculate average rating and count
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

    res.status(200).json({
      ...product,
      variants,
      averageRating: Number(averageRating.toFixed(2)), // format to 2 decimals
      reviewCount,
    });
  } catch (error) {
    console.error(error);
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
      .select("productName sellingPrice thumbnail category urlSlug")
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
      .select("productName sellingPrice thumbnail category urlSlug")
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

    // Return combined results categorized by entity type
    res.status(200).json({ products, categories, brands });
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
