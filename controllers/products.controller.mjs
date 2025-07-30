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
            variants = [],
        } = req.body;

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

            if (missingFields.length > 0) {
                return res.status(400).json({ message: `Missing fields: ${missingFields.join(', ')}` });
            }
        }

        const cleanSKU = SKU?.trim();
        const cleanBarcode = barcode?.trim();

        const variantSKUs = variants.map(v => v.SKU?.trim()).filter(Boolean);
        const variantBarcodes = variants.map(v => v.barcode?.trim()).filter(Boolean);

        const allSKUs = cleanSKU ? [cleanSKU, ...variantSKUs] : [...variantSKUs];
        const allBarcodes = cleanBarcode ? [cleanBarcode, ...variantBarcodes] : [...variantBarcodes];

        if (allSKUs.length > 0) {
            const existingSku = await Promise.any([
                Product.findOne({ SKU: { $in: allSKUs } }),
                Variant.findOne({ SKU: { $in: allSKUs } }),
            ]);
            if (existingSku) {
                return res.status(400).json({ message: `SKU '${existingSku.SKU}' is already in use` });
            }
        }

        if (allBarcodes.length > 0) {
            const existingBarcode = await Promise.any([
                Product.findOne({ barcode: { $in: allBarcodes } }),
                Variant.findOne({ barcode: { $in: allBarcodes } }),
            ]);
            if (existingBarcode) {
                return res.status(400).json({ message: `Barcode '${existingBarcode.barcode}' is already in use` });
            }
        }

        const nameExists = await Product.findOne({ productName });
        if (nameExists) {
            return res.status(400).json({ message: 'Product name is already taken' });
        }

        const newProduct = await Product.create(req.body);

        if (hasVariant && variants.length > 0) {
            const variantDocs = variants.map(variant => ({
                ...variant,
                SKU: variant.SKU?.trim(),
                barcode: variant.barcode?.trim(),
                productId: newProduct._id,
            }));

            const newVariants = await Variant.insertMany(variantDocs);

            const defaultVar = newVariants.find(v => v.isDefault);
            if (defaultVar) {
                newProduct.defaultVariant = defaultVar._id;
                await newProduct.save();
            }
        }

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};


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
            limit = 8
        } = req.query;

        const query = {};

        if (search) {
            query.$or = [
                { productName: { $regex: search, $options: 'i' } },
                { productDescription: { $regex: search, $options: 'i' } },
                { SKU: { $regex: search, $options: 'i' } },
                { barcode: { $regex: search, $options: 'i' } }
            ];
        }

        if (brand) query.brand = brand;
        if (category) query.category = category;
        if (visibility) query.visibility = visibility;
        if (status) query.productStatus = status;

        if (minPrice || maxPrice) {
            query.sellingPrice = {};
            if (minPrice) query.sellingPrice.$gte = parseFloat(minPrice);
            if (maxPrice) query.sellingPrice.$lte = parseFloat(maxPrice);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        let sortBy = { createdAt: -1 };
        if (sort) {
            const [field, order] = sort.split(':');
            sortBy = { [field]: order === 'asc' ? 1 : -1 };
        }

        const products = await Product.find(query)
            .populate('brand category')
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const productIdsWithVariants = products
            .filter(p => p.hasVariant && p.defaultVariant)
            .map(p => p.defaultVariant);

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

        const total = await Product.countDocuments(query);

        res.status(200).json({
            data: enrichedProducts,
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
        } = updates;

        if (hasVariant === false || hasVariant === 'false') {
            const missingFields = [];

            if (SKU === undefined || SKU === '') missingFields.push('SKU');
            if (barcode === undefined || barcode === '') missingFields.push('barcode');
            if (!productImages || productImages.length === 0) missingFields.push('productImages');
            if (costPrice === undefined) missingFields.push('costPrice');
            if (sellingPrice === undefined) missingFields.push('sellingPrice');
            if (mrpPrice === undefined) missingFields.push('mrpPrice');

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

