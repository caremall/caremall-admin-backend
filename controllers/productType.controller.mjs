import ProductType from '../models/ProductType.mjs';


export const createProductType = async (req, res) => {
    try {
        const { name } = req.body

        const nameExists = await ProductType.findOne({ name: name })
        if (nameExists) return res.json({ message: 'Prodcut type name already exists' })

        const productType = await ProductType.create(req.body);

        res.status(201).json({ success: true, message: 'Product type created' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};


export const getAllProductTypes = async (req, res) => {
    try {
        const { search, attributeName, page = 1, limit = 10 } = req.query;

        const filter = {};

        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }

        if (attributeName) {
            filter['attributes.name'] = { $regex: attributeName, $options: 'i' };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [types, total] = await Promise.all([
            ProductType.find(filter)
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 }), // optional sorting
            ProductType.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            data: types,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages,
                hasNextPage: parseInt(page) < totalPages,
                hasPrevPage: parseInt(page) > 1
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};




export const getProductTypeById = async (req, res) => {
    try {
        const type = await ProductType.findById(req.params.id);
        if (!type) return res.status(404).json({ message: 'Not found' });

        res.status(200).json(type);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


export const updateProductType = async (req, res) => {
    try {
        const { name } = req.body

        const nameExists = await ProductType.findOne({ name: name, _id: { $ne: req.params.id } })
        if (nameExists) return res.json({ message: 'Prodcut type name already exists' })

        const updated = await ProductType.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ message: 'Not found' });
        res.status(200).json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

export const deleteProductType = async (req, res) => {
    try {
        const deleted = await ProductType.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Not found' });
        res.status(200).json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
