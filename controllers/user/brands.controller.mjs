import Brand from "../../models/Brand.mjs";
import Product from "../../models/Product.mjs";

export const getAllBrands = async (req, res) => {
  try {
    const brands = await Brand.find();
    res.json(brands);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getBrandById = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    const products = await Product.find({ brand: req.params.id });
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }
    res.json({ ...brand.toObject(), products });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
