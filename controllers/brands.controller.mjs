import Brand from '../models/Brand.mjs';
import Product from '../models/Product.mjs'

export const createBrand = async (req, res) => {
    try {
        const {
            brandName,
            tagline,
            description,
            termsAndConditions,
            status,
            imageUrl
        } = req.body;

        const existingBrand = await Brand.findOne({ brandName: brandName.trim() });
        if (existingBrand) {
            return res.status(200).json({ message: 'Brand already exists' });
        }

        const newBrand = await Brand.create({
            brandName,
            tagline,
            description,
            termsAndConditions,
            imageUrl,
            status
        });

        res.status(201).json({ success: true, message: 'Brand created', data: newBrand });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};


export const getAllBrands = async (req, res) => {
    try {
        const { search = '', status, page = 1, limit = 10 } = req.query;

        const query = {
            ...(search && {
                brandName: { $regex: search, $options: 'i' }
            }),
            ...(status && { status })
        };

        const skip = (Number(page) - 1) * Number(limit);

        const [brands, total] = await Promise.all([
            Brand.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Brand.countDocuments(query)
        ]);

        res.status(200).json({
            data: brands,
            meta: {
                page: Number(page),
                totalPages: Math.ceil(total / limit),
                total
            },

        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};


export const getBrandById = async (req, res) => {
    try {
        const brand = await Brand.findById(req.params.id);
        if (!brand) {
            return res.status(404).json({ message: 'Brand not found' });
        }
        res.status(200).json(brand);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};


export const updateBrand = async (req, res) => {
    try {
        const {
            brandName,
            tagline,
            description,
            termsAndConditions,
            status,
            imageUrl
        } = req.body;


        const brand = await Brand.findById(req.params.id);
        if (!brand) {
            return res.status(404).json({ message: 'Brand not found' });
        }


        const duplicate = await Brand.findOne({
            brandName: brandName?.trim(),
            _id: { $ne: req.params.id }
        });
        if (duplicate) {
            return res.status(200).json({ message: 'Brand with this brand name already exists' });
        }

        brand.brandName = brandName || brand.brandName;
        brand.tagline = tagline || brand.tagline;
        brand.description = description || brand.description;
        brand.termsAndConditions = termsAndConditions || brand.termsAndConditions;
        brand.status = status || brand.status;
        brand.imageUrl = imageUrl || brand.imageUrl

        await brand.save();

        res.status(200).json({ success: true, message: 'Brand updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};


export const deleteBrand = async (req, res) => {
    try {
        const product = await Product.findOne({ brand: req.params.id })
        if (product) return res.status(200).json({
            message: "Brand already used in products"
        })

        const brand = await Brand.findByIdAndDelete(req.params.id);

        if (!brand) {
            return res.status(404).json({ message: 'Brand not found' });
        }
        res.status(200).json({ success: true, message: 'Brand deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
