import Brand from "../../models/Brand.mjs";
import Product from "../../models/Product.mjs";
import { uploadBase64Image } from "../../utils/uploadImage.mjs";

export const createBrand = async (req, res) => {
  try {
    const {
      brandName,
      tagline,
      description,
      termsAndConditions,
      status,
      imageUrl,
    } = req.body;

    const assignedWarehouse = req.user?.assignedWarehouses;
    const warehouseId = assignedWarehouse?._id || null;

    // Check existing brand by name scoped to warehouse if warehouseId exists
    // or just by brandName if no warehouse linked
    const existingBrandQuery = warehouseId
      ? { brandName: brandName.trim(), warehouse: warehouseId }
      : { brandName: brandName.trim(), warehouse: { $exists: false } };

    const existingBrand = await Brand.findOne(existingBrandQuery);
    if (existingBrand) {
      return res.status(200).json({
        message: warehouseId
          ? "Brand already exists in this warehouse"
          : "Brand already exists",
      });
    }

    // Upload base64 image to S3 if imageUrl provided as base64
    let uploadedImageUrl = null;
    if (imageUrl) {
      uploadedImageUrl = await uploadBase64Image(imageUrl, "brand-images/");
    }

    // Prepare brand data
    const brandData = {
      brandName,
      tagline,
      description,
      termsAndConditions,
      imageUrl: uploadedImageUrl,
      status,
    };

    // Assign warehouse if warehouseId exists
    if (warehouseId) {
      brandData.warehouse = warehouseId;
    }

    const newBrand = await Brand.create(brandData);

    res
      .status(201)
      .json({ success: true, message: "Brand created", data: newBrand });
  } catch (error) {
    console.error("Create Brand error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
  }
};

export const getAllBrands = async (req, res) => {
  try {
    const { search = "", status } = req.query;

    const query = {
      ...(search && {
        brandName: { $regex: search, $options: "i" },
      }),
      ...(status && { status }),
    };

    const brands = await Brand.find(query).populate("warehouse").sort({ createdAt: -1 })

    res.status(200).json(brands);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getBrandById = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id).populate("warehouse");
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }
    res.status(200).json(brand);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
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
      imageUrl,
    } = req.body;

    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    const duplicate = await Brand.findOne({
      brandName: brandName?.trim(),
      _id: { $ne: req.params.id },
    });
    if (duplicate) {
      return res
        .status(200)
        .json({ message: "Brand with this brand name already exists" });
    }

    // If imageUrl is base64, upload to S3 and get new URL
    if (
      imageUrl &&
      typeof imageUrl === "string" &&
      imageUrl.startsWith("data:image/")
    ) {
      const uploadedImageUrl = await uploadBase64Image(
        imageUrl,
        "brand-images/"
      );
      brand.imageUrl = uploadedImageUrl;
    } else if (imageUrl) {
      // If not base64, use as is (could be existing URL)
      brand.imageUrl = imageUrl;
    }

    brand.brandName = brandName || brand.brandName;
    brand.tagline = tagline || brand.tagline;
    brand.description = description || brand.description;
    brand.termsAndConditions = termsAndConditions || brand.termsAndConditions;
    brand.status = status || brand.status;

    await brand.save();

    res.status(200).json({ success: true, message: "Brand updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


export const deleteBrand = async (req, res) => {
  try {
    const product = await Product.findOne({ brand: req.params.id });
    if (product)
      return res.status(500).json({
        message: "Brand already used in products",
      });

    const brand = await Brand.findByIdAndDelete(req.params.id);

    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Brand deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
