import Product from '../models/Product.mjs';
import Variant from '../models/Variant.mjs';


export const createProduct = async (req, res) => {
    try {
        const {
            productName,
            productDescription,
            brand,
            category,
            hasVariant,
            SKU,
            barcode,
            productImages,
            costPrice,
            sellingPrice,
            mrpPrice,
            availableQuantity,
            minimumQuantity,
            reorderQuantity,
            maximumQuantity,
            variants = [],
            ...rest
        } = req.body;

        const nameExists = await Product.findOne({ productName: productName })
        if (nameExists) return res.json({ message: 'Product name is already taken' })

        const SkuExists = await Product.findOne({ SKU: SKU })
        if (SkuExists) return res.json({ message: 'This SKU is already in Use' })

        const barcodeExists = await Product.findOne({ barcode: barcode })
        if (barcodeExists) return res.json({ message: 'This Barcode is already taken' })


        if (!productName || !productDescription || !brand || !category) {
            return res.status(400).json({ message: 'Required fields missing' });
        }

        if (!hasVariant) {
            const missingFields = [];

            if (!SKU) missingFields.push('SKU');
            if (!barcode) missingFields.push('barcode');
            if (!productImages || !productImages.length) missingFields.push('productImages');
            if (costPrice === undefined) missingFields.push('costPrice');
            if (sellingPrice === undefined) missingFields.push('sellingPrice');
            if (mrpPrice === undefined) missingFields.push('mrpPrice');
            if (availableQuantity === undefined) missingFields.push('availableQuantity');
            if (minimumQuantity === undefined) missingFields.push('minimumQuantity');
            if (reorderQuantity === undefined) missingFields.push('reorderQuantity');
            if (maximumQuantity === undefined) missingFields.push('maximumQuantity');

            if (missingFields.length) {
                return res.status(400).json({ message: `Missing fields: ${missingFields.join(', ')}` });
            }
        }

        const newProduct = await Product.create(req.body);

        if (hasVariant && Array.isArray(variants) && variants.length > 0) {
            const variantDocs = variants.map(variant => ({
                ...variant,
                productId: newProduct._id,
            }));
            await Variant.insertMany(variantDocs);
        }

        res.status(201).json({
            success: true, message: 'Product created successfully'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
}

export const getAllProducts = async (req, res) => {
    try {
        const {
            search,
            brand,
            category,
            visibility,
            status,
            minPrice,
            maxPrice,
            sort,
            page = 1,
            limit = 20
        } = req.query;

        const query = {};

        // 🔍 Text Search (productName or productDescription)
        if (search) {
            query.$or = [
                { productName: { $regex: search, $options: 'i' } },
                { productDescription: { $regex: search, $options: 'i' } }
            ];
        }

        // 🎯 Filters
        if (brand) query.brand = brand;
        if (category) query.category = category;
        if (visibility) query.visibility = visibility;
        if (status) query.productStatus = status;

        // 💰 Price Range
        if (minPrice || maxPrice) {
            query.sellingPrice = {};
            if (minPrice) query.sellingPrice.$gte = parseFloat(minPrice);
            if (maxPrice) query.sellingPrice.$lte = parseFloat(maxPrice);
        }

        // 🔢 Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // 🔃 Sorting
        let sortBy = { createdAt: -1 }; // default: newest first
        if (sort) {
            const [field, order] = sort.split(':');
            sortBy = { [field]: order === 'asc' ? 1 : -1 };
        }

        const products = await Product.find(query)
            .populate('brand category')
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Product.countDocuments(query);

        res.status(200).json({
            data: products,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};



export const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('brand category');
        if (!product) return res.status(404).json({ message: 'Product not found' });
        let variants
        if (product.hasVariant) {
            variants = await Variant.find({ productId: req.params.id })
        }
        res.status(200).json({ ...product, variants });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
}


export const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const updates = req.body;

        const existingProduct = await Product.findById(productId);
        if (!existingProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const {
            hasVariant,
            SKU,
            barcode,
            productImages,
            costPrice,
            sellingPrice,
            mrpPrice,
            availableQuantity,
            minimumQuantity,
            reorderQuantity,
            maximumQuantity,
        } = updates;

        if (hasVariant === false || hasVariant === 'false') {
            const missingFields = [];

            if (SKU === undefined || SKU === '') missingFields.push('SKU');
            if (barcode === undefined || barcode === '') missingFields.push('barcode');
            if (!productImages || productImages.length === 0) missingFields.push('productImages');
            if (costPrice === undefined) missingFields.push('costPrice');
            if (sellingPrice === undefined) missingFields.push('sellingPrice');
            if (mrpPrice === undefined) missingFields.push('mrpPrice');
            if (availableQuantity === undefined) missingFields.push('availableQuantity');
            if (minimumQuantity === undefined) missingFields.push('minimumQuantity');
            if (reorderQuantity === undefined) missingFields.push('reorderQuantity');
            if (maximumQuantity === undefined) missingFields.push('maximumQuantity');

            if (missingFields.length) {
                return res.status(400).json({ message: `Missing fields for non-variant product: ${missingFields.join(', ')}` });
            }
        }

        await Product.findByIdAndUpdate(productId, updates, {
            new: true,
            runValidators: true,
        });

        res.status(200).json({ success: true, message: 'Product updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};



export const deleteProduct = async (req, res) => {
    try {
        const deleted = await Product.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Product not found' });
        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
}

