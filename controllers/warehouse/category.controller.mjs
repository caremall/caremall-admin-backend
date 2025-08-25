import Category from "../../models/Category.mjs";
import Product from "../../models/Product.mjs";
import { uploadBase64Image } from "../../utils/uploadImage.mjs";

export const createCategory = async (req, res) => {
  try {
    let { type, name, image, description, parentId, categoryCode, status } =
      req.body;

    parentId = parentId?.trim() || undefined;

    if (!parentId || type === "Main") {
      parentId = undefined;
    }

    // Check name conflict
    const nameConflict = await Category.findOne({ name, parentId });
    if (nameConflict) {
      return res.status(200).json({
        message:
          type === "Main"
            ? "A category with the same name already exists."
            : "A category with the same name already exists under this parent.",
      });
    }

    // Check code conflict
    const codeConflict = await Category.findOne({ categoryCode });
    if (codeConflict) {
      return res
        .status(200)
        .json({ message: "Category code is already in use." });
    }

    // Upload image if provided as base64 string
    let uploadedImageUrl = null;
    if (image) {
      uploadedImageUrl = await uploadBase64Image(image, "category-images/");
    }

    // Create category with uploaded image URL
    await Category.create({
      type,
      image: uploadedImageUrl,
      name,
      description,
      parentId,
      categoryCode,
      status,
    });

    res.status(201).json({ message: "Category created", success: true });
  } catch (error) {
    console.error("Create Category error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
  }
};


export const getAllCategories = async (req, res) => {
  try {
    const { search = "", type, status, parentId } = req.query;

    const filter = { type: "Main" };

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (parentId) filter.parentId = parentId;
    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const categories = await Category.find(filter)
      .populate("products").populate("subcategories")
      .sort({ createdAt: -1 });

    res.status(200).json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).populate("products").populate("subcategories");
    if (!category)
      return res.status(404).json({ message: "Category not found" });

    res.status(200).json(category);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch category" });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    let { type, name, image, description, parentId, categoryCode, status } =
      req.body;

    parentId = parentId?.trim() || undefined;

    if (!parentId || type === "Main") {
      parentId = undefined;
    }

    if (!name || !type || !categoryCode) {
      return res.status(200).json({ message: "Required fields are missing" });
    }

    // Name conflict check excluding current category
    const nameConflict = await Category.findOne({
      name,
      parentId,
      _id: { $ne: id },
    });

    if (nameConflict) {
      return res.status(200).json({
        message:
          type === "Main"
            ? "Another category with the same name exists."
            : "Another category with the same name exists under this parent.",
      });
    }

    // Category code conflict check excluding current category
    const codeConflict = await Category.findOne({
      categoryCode,
      _id: { $ne: id },
    });

    if (codeConflict) {
      return res.status(200).json({
        message: "Category code is already in use by another category.",
      });
    }

    const category = await Category.findById(id);
    if (!category)
      return res.status(404).json({ message: "Category not found" });

    // Check if image is base64 string (simple check for 'data:image/')
    if (image && typeof image === "string" && image.startsWith("data:image/")) {
      // Upload new image and replace the image URL
      const uploadedImageUrl = await uploadBase64Image(
        image,
        "category-images/"
      );
      category.image = uploadedImageUrl;
    } else if (image) {
      // If image provided but not base64, set as is (could be URL)
      category.image = image;
    }

    category.name = name ?? category.name;
    category.type = type ?? category.type;
    category.description = description ?? category.description;
    category.status = status ?? category.status;
    category.parentId =
      type === "Main" ? undefined : parentId ?? category.parentId;
    category.categoryCode = categoryCode ?? category.categoryCode;

    await category.save();

    res.status(200).json({ message: "Category updated", success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update category" });
  }
};


export const changeCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "inactive"].includes(status))
      return res.status(400).json({ message: "Invalid status" });

    const updated = await Category.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ message: "Category not found" });

    res.status(200).json({ message: "Status updated", category: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update status" });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const subCategory = await Category.findOne({ parentId: id });
    if (subCategory) {
      return res.status(400).json({
        message: "Cannot delete: This category has subcategories linked.",
      });
    }

    const product = await Product.findOne({ category: id });
    if (product) {
      return res.status(400).json({
        message: "Cannot delete: This category is used in products.",
      });
    }

    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete category" });
  }
};
