import Product from "../../models/Product.mjs";
import ProductType from "../../models/ProductType.mjs";

export const createProductType = async (req, res) => {
  const { name } = req.body;

  const nameExists = await ProductType.findOne({ name: name });
  if (nameExists)
    return res.json({ message: "Prodcut type name already exists" });

  await ProductType.create(req.body);

  res.status(201).json({ success: true, message: "Product type created" });
};

export const getAllProductTypes = async (req, res) => {
  try {
    const { search, attributeName } = req.query;

    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (attributeName) {
      filter["attributes.name"] = { $regex: attributeName, $options: "i" };
    }

    const types = await ProductType.find(filter)
      .sort({ createdAt: -1 })
      .lean()

    res.status(200).json(types)
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getProductTypeById = async (req, res) => {
  try {
    const type = await ProductType.findById(req.params.id);
    if (!type) return res.status(404).json({ message: "Not found" });

    res.status(200).json(type);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateProductType = async (req, res) => {
  try {
    const { name } = req.body;

    const nameExists = await ProductType.findOne({
      name: name,
      _id: { $ne: req.params.id },
    });
    if (nameExists)
      return res.json({ message: "Prodcut type name already exists" });

    const updated = await ProductType.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.status(200).json({ success: true, message: "Product type updated" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteProductType = async (req, res) => {
  try {
    const product = await Product.findOne({ productType: req.params.id });
    if (product)
      return res
        .status(401)
        .json({ message: "Product type is already used for several products" });

    const deleted = await ProductType.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.status(200).json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
