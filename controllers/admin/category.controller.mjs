import Category from "../../models/Category.mjs";
import Product from "../../models/Product.mjs";
import { uploadBase64Image } from "../../utils/uploadImage.mjs";

export const createCategory = async (req, res) => {
  try {
    let { type, name, image, isPopular, description, parentId, categoryCode, status } = req.body;

    parentId = parentId?.trim() || undefined;

    if (!parentId || type === "Main") {
      parentId = undefined;
    }

    
    const nameConflict = await Category.findOne({ name, parentId });
    if (nameConflict) {
      return res.status(409).json({
        success: false,
        message:
          type === "Main"
            ? "A category with the same name already exists."
            : "A category with the same name already exists under this parent.",
      });
    }

    
    const codeConflict = await Category.findOne({ categoryCode });
    if (codeConflict) {
      return res.status(409).json({
        success: false,
        message: "Category code is already in use.",
      });
    }

    
    let uploadedImageUrl = null;
    if (image) {
      uploadedImageUrl = await uploadBase64Image(image, "category-images/");
    }

    
    await Category.create({
      type,
      image: uploadedImageUrl,
      name,
      description,
      parentId,
      categoryCode,
      isPopular,
      status,
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
    });

  } catch (error) {
    console.error("Create Category error:", error);
    return res.status(500).json({
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
         .populate({
           path:"products",
           select: "productName urlSlug",
         })
         .populate({
           path: "subcategories",
           select: "name categoryCode",
         })
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
    let {
      type,
      name,
      image,
      isPopular,
      description,
      parentId,
      categoryCode,
      status,
    } = req.body;

    
    parentId = type === "Main" ? undefined : parentId?.trim() || undefined;

    
    if (!name || !type || !categoryCode) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    
    const nameConflict = await Category.findOne({
      name,
      parentId,
      _id: { $ne: id },
    });

    if (nameConflict) {
      return res.status(409).json({
        message:
          type === "Main"
            ? "Another category with the same name exists."
            : "Another category with the same name exists under this parent.",
      });
    }

    
    const codeConflict = await Category.findOne({
      categoryCode,
      _id: { $ne: id },
    });

    if (codeConflict) {
      return res.status(409).json({
        message: "Category code is already in use by another category.",
      });
    }

    
    category.name = name;
    category.type = type;
    category.description = description;
    category.status = status;
    category.isPopular = isPopular ?? false; 
    category.parentId = parentId;
    category.categoryCode = categoryCode;

    
    if (typeof image === "string") {
      if (image.startsWith("data:image/")) {
        
        const uploadedImageUrl = await uploadBase64Image(
          image,
          "category-images/"
        );
        category.image = uploadedImageUrl;
      } else if (image === "") {
    
        category.image = null;
      } else {
       
        category.image = image;
      }
    }

    await category.save();

    return res.status(200).json({ message: "Category updated", success: true });
  } catch (err) {
    console.error("Update Category error:", err);
    res
      .status(500)
      .json({ message: "Failed to update category", error: err.message });
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
