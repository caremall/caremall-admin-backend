import Category from '../models/Category.mjs';
import Product from '../models/Product.mjs'



export const createCategory = async (req, res) => {
    try {
        const { type, name, description, parentId, categoryCode, status } = req.body;

        const nameConflict = await Category.findOne({ name, parentId });

        if (nameConflict) {
            return res.status(400).json({ message: 'A category with the same name already exists under this parent.' });
        }

        const codeConflict = await Category.findOne({ categoryCode });

        if (codeConflict) {
            return res.status(400).json({ message: 'Category code is already in use.' });
        }

        await Category.create({
            type,
            name,
            description,
            parentId: parentId || null,
            categoryCode,
            status,
        });

        res.status(201).json({ message: 'Category created', success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to create category' });
    }
};


export const getAllCategories = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', type, status, parentId } = req.query;

        const filter = {};

        if (type) filter.type = type;
        if (status) filter.status = status;
        if (parentId) filter.parentId = parentId
        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }

        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            Category.find(filter).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
            Category.countDocuments(filter),
        ]);

        res.status(200).json({
            data,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch categories' });
    }
};


export const getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });

        res.status(200).json(category);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch category' });
    }
};


export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            type,
            name,
            description,
            parentId,
            categoryCode,
            status
        } = req.body.data;

        if (!name || !type || !categoryCode) {
            return res.status(400).json({ message: 'Required fields are missing' });
        }

        const nameConflict = await Category.findOne({
            name,
            parentId,
            _id: { $ne: id }
        });

        if (nameConflict) {
            return res.status(400).json({ message: 'Another category with the same name exists under this parent.' });
        }

        const codeConflict = await Category.findOne({
            categoryCode,
            _id: { $ne: id }
        });

        if (codeConflict) {
            return res.status(400).json({ message: 'Category code is already in use by another category.' });
        }

        const category = await Category.findById(id);
        if (!category) return res.status(404).json({ message: 'Category not found' });

        category.name = name ?? category.name;
        category.type = type ?? category.type;
        category.description = description ?? category.description;
        category.status = status ?? category.status;
        category.parentId = type === 'Main' ? null : parentId ?? category.parentId;
        category.categoryCode = categoryCode ?? category.categoryCode;


        await category.save()

        res.status(200).json({ message: 'Category updated', success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update category' });
    }
};


export const changeCategoryStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['active', 'inactive'].includes(status))
            return res.status(400).json({ message: 'Invalid status' });

        const updated = await Category.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!updated) return res.status(404).json({ message: 'Category not found' });

        res.status(200).json({ message: 'Status updated', category: updated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update status' });
    }
};


export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const subCategory = await Category.findOne({ parentId: id });
        if (subCategory) {
            return res.status(400).json({
                message: 'Cannot delete: This category has subcategories linked.',
            });
        }

        const product = await Product.findOne({ category: id });
        if (product) {
            return res.status(400).json({
                message: 'Cannot delete: This category is used in products.',
            });
        }

        const deleted = await Category.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.status(200).json({ message: 'Category deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to delete category' });
    }
};

