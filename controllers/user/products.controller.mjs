import mongoose from "mongoose";
import Product from "../../models/Product.mjs";
import Variant from "../../models/Variant.mjs";
import { enrichProductsWithDefaultVariants } from "../../utils/enrichedProducts.mjs";

export const getFilteredProducts = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            category,
            brand,
            tags,
            search,
            color,
            size,
            minPrice,
            maxPrice,
        } = req.query;

        const skip = (page - 1) * limit;

        // Step 1: Build variant filter
        const variantMatch = {};

        const variantFilters = [];
        if (color) variantFilters.push({ name: 'color', value: color });
        if (size) variantFilters.push({ name: 'size', value: size });

        if (variantFilters.length) {
            variantMatch.variantAttributes = {
                $all: variantFilters.map(attr => ({
                    $elemMatch: attr,
                })),
            };
        }

        if (minPrice || maxPrice) {
            const priceFilter = {};
            if (minPrice) priceFilter.$gte = parseFloat(minPrice);
            if (maxPrice) priceFilter.$lte = parseFloat(maxPrice);
            variantMatch.sellingPrice = priceFilter;
        }

        // Step 2: Find matching variant productIds
        const matchedVariants = await Variant.find(variantMatch).select('productId').lean();
        const matchingProductIds = [...new Set(matchedVariants.map(v => v.productId.toString()))];

        // Step 3: Build product filter
        const productMatch = {
            productStatus: 'published',
            visibility: 'visible',
        };

        if (category) productMatch.category = new mongoose.Types.ObjectId(category);
        if (brand) productMatch.brand = new mongoose.Types.ObjectId(brand);
        if (tags) productMatch.tags = { $in: tags.split(',') };
        if (search) {
            const regex = new RegExp(search, 'i');
            productMatch.$or = [
                { productName: regex },
                { shortDescription: regex },
                { productDescription: regex },
            ];
        }

        if (matchingProductIds.length) {
            productMatch._id = { $in: matchingProductIds };
        } else if (variantFilters.length || minPrice || maxPrice) {
            // If variant filters applied but no match, return empty
            return res.status(200).json({
                data: [],
                totalCount: 0,
                totalPages: 0,
                currentPage: Number(page),
            });
        }

        // Step 4: Fetch filtered products with pagination
        const [products, totalCount] = await Promise.all([
            Product.find(productMatch)
                .populate('brand category')
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Product.countDocuments(productMatch),
        ]);

        // Step 5: Enrich with matching variants for each product
        const enrichedProducts = await Promise.all(
            products.map(async product => {
                const variants = await Variant.find({
                    productId: product._id,
                    ...(variantFilters.length || minPrice || maxPrice ? variantMatch : {}),
                }).lean();

                return {
                    ...product,
                    variants,
                };
            })
        );

        const totalPages = Math.ceil(totalCount / limit);

        res.status(200).json({
            data: enrichedProducts,
            totalCount,
            totalPages,
            currentPage: Number(page),
        });
    } catch (error) {
        console.error('Error filtering products:', error);
        res.status(500).json({ message: 'Server error while filtering products' });
    }
};


export const getMostWantedProducts = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 4;

        const products = await Product.find().lean();
        const enrichedProducts = await enrichProductsWithDefaultVariants(products)

        const scoredProducts = enrichedProducts.map(product => {

            const orderCount = product.orderCount || 0;
            const addedToCartCount = product.addedToCartCount || 0;
            const wishlistCount = product.wishlistCount || 0;
            const viewsCount = product.viewsCount || 0;

            const score = (orderCount * 3) +
                (addedToCartCount * 2) +
                (wishlistCount * 1) +
                (viewsCount * 0.5);

            return { ...product, mostWantedScore: score };
        });

        const sorted = scoredProducts
            .sort((a, b) => b.mostWantedScore - a.mostWantedScore)
            .slice(0, limit);

        res.status(200).json(sorted);
    } catch (error) {
        console.error('Error fetching most wanted products:', error);
        res.status(500).json({ message: 'Server error fetching most wanted products' });
    }
};

export const getNewArrivalProducts = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 4;

        const products = await Product.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        const enrichedProducts = await enrichProductsWithDefaultVariants(products)

        res.status(200).json(enrichedProducts);
    } catch (error) {
        console.error('Error fetching new arrivals:', error);
        res.status(500).json({ message: 'Server error fetching new arrival products' });
    }
};

export const getBestSellingProducts = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 4;

        const bestSellers = await Product.find()
            .sort({ orderCount: -1 })
            .limit(limit)
            .lean();
        const products = await enrichProductsWithDefaultVariants(bestSellers)

        res.status(200).json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching best sellers' });
    }
};

export const getProductById = async (req, res) => {
    try {
        const product = await Product.findOne({ urlSlug: req.params.slug }).lean()
        if (!product) return res.status(200).json({ message: 'Product not found' })

        let variants = []
        if (product.hasVariant) {
            variants = await Variant.find({ productId: product._id }).lean()
        }
        res.status(200).json({ ...product, variants })

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching best sellers' });
    }
}



export const getSearchSuggestions = async (reg, res) => {
    try {
        const search = (reg.query.q || "").trim()
        if(!search){
            return res.status(200).json([])
        }
        
        const regex = new RegExp(search, "i");
        
        const results = await Product.find({
            productStatus: "published",
            visibility: "visible",
            $or: [
                {productName: regex},
                {sku: regex},
                {shortDescription: regex},
                {productDescription: regex},
            ]
        })
        .select("productName price thumbanail category")
        .limit(10)
        .lean()

        res.status(200).json(results);
    }catch(error){
        console.error("Error feching search suggestions: ", error);
        res.status(500).json({message: "server error while fetching search results"})
    }
}