import Product from "../models/Product.mjs";
import Variant from "../models/Variant.mjs";

/**
 * @desc Create new variants for a product
 * @route POST /api/variants/:productId
 */
export const createVariants = async (req, res) => {
    try {
        const { productId } = req.params;
        const { variants } = req.body;

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: "Product not found" });

        // Check SKU & Barcode uniqueness across products and variants
        for (let variant of variants) {
            if (variant.SKU) {
                const exists = await Variant.findOne({ SKU: variant.SKU.trim() });
                const existsInProduct = await Product.findOne({ SKU: variant.SKU.trim() });
                if (exists || existsInProduct)
                    return res.status(400).json({ message: `SKU '${variant.SKU}' already exists` });
            }
            if (variant.barcode) {
                const exists = await Variant.findOne({ barcode: variant.barcode.trim() });
                const existsInProduct = await Product.findOne({ barcode: variant.barcode.trim() });
                if (exists || existsInProduct)
                    return res.status(400).json({ message: `Barcode '${variant.barcode}' already exists` });
            }
        }

        // Create variants
        const newVariants = await Variant.insertMany(
            variants.map(v => ({ ...v, productId }))
        );

        // Update default variant in product if provided
        const defaultVar = newVariants.find(v => v.isDefault);
        if (defaultVar) {
            product.defaultVariant = defaultVar._id;
            await product.save();
        }

        res.status(201).json({ success: true, message: "Variants created successfully", variants: newVariants });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

/**
 * @desc Get all variants (admin)
 * @route GET /api/variants
 */
export const getAllVariants = async (req, res) => {
    try {
        const variants = await Variant.find().populate("productId");
        res.status(200).json({ success: true, variants });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

/**
 * @desc Get variants by productId
 * @route GET /api/variants/product/:productId
 */
export const getVariantsByProductId = async (req, res) => {
    try {
        const variants = await Variant.find({ productId: req.params.productId });
        res.status(200).json({ success: true, variants });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

/**
 * @desc Update a variant
 * @route PUT /api/variants/:id
 */
export const updateVariant = async (req, res) => {
    try {
        const variant = await Variant.findById(req.params.id);
        if (!variant) return res.status(404).json({ message: "Variant not found" });

        // If updating SKU/barcode, check uniqueness
        if (req.body.SKU && req.body.SKU !== variant.SKU) {
            const exists = await Variant.findOne({ SKU: req.body.SKU.trim() });
            const existsInProduct = await Product.findOne({ SKU: req.body.SKU.trim() });
            if (exists || existsInProduct)
                return res.status(400).json({ message: `SKU '${req.body.SKU}' already exists` });
        }
        if (req.body.barcode && req.body.barcode !== variant.barcode) {
            const exists = await Variant.findOne({ barcode: req.body.barcode.trim() });
            const existsInProduct = await Product.findOne({ barcode: req.body.barcode.trim() });
            if (exists || existsInProduct)
                return res.status(400).json({ message: `Barcode '${req.body.barcode}' already exists` });
        }

        Object.assign(variant, req.body);
        await variant.save();

        res.status(200).json({ success: true, message: "Variant updated successfully", variant });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

/**
 * @desc Delete a variant
 * @route DELETE /api/variants/:id
 */
export const deleteVariant = async (req, res) => {
    try {
        const variant = await Variant.findById(req.params.id);
        if (!variant) return res.status(404).json({ message: "Variant not found" });

        await Variant.findByIdAndDelete(req.params.id);

        // If it was default variant, remove from product
        await Product.updateOne(
            { defaultVariant: req.params.id },
            { $unset: { defaultVariant: "" } }
        );

        res.status(200).json({ success: true, message: "Variant deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

/**
 * @desc Set a default variant for a product
 * @route PUT /api/variants/:id/set-default
 */
export const setDefaultVariant = async (req, res) => {
    try {
        const variant = await Variant.findById(req.params.id);
        if (!variant) return res.status(404).json({ message: "Variant not found" });

        // Unset previous default
        await Variant.updateMany({ productId: variant.productId }, { isDefault: false });

        // Set this as default
        variant.isDefault = true;
        await variant.save();

        // Update in product
        await Product.findByIdAndUpdate(variant.productId, { defaultVariant: variant._id });

        res.status(200).json({ success: true, message: "Default variant set successfully", variant });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
