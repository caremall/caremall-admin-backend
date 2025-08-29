import PhotoGallery from "../../models/photoGallery.mjs";
import { uploadBase64Image } from "../../utils/uploadImage.mjs";

export const createPhotoGallery = async (req, res) => {
  try {
    const { title, image, buttonText, redirectionLink } = req.body;

    if (!title || !image || !buttonText || !redirectionLink) {
      return res.status(400).json({ message: "All fields are required." });
    }
    let imageUrl = "";
    if (image) {
      const uploaded = await uploadBase64Image(image, "gallery-images/");
      imageUrl = uploaded;
    }
    const photoGallery = await PhotoGallery.create({
      title,
      imageUrl,
      buttonText,
      redirectionLink,
    });

    res
      .status(201)
      .json({ success: true, message: "Photo gallery created", photoGallery });
  } catch (error) {
    console.error("Create PhotoGallery Error:", error);
    res.status(500).json({ message: "Failed to create photo gallery" });
  }
};

export const getPhotoGalleryById = async (req, res) => {
  try {
    const { id } = req.params;
    const gallery = await PhotoGallery.findById(id).lean();

    if (!gallery) {
      return res.status(404).json({ message: "Photo gallery not found" });
    }

    res.status(200).json({ success: true, data: gallery });
  } catch (error) {
    console.error("Get PhotoGallery By ID Error:", error);
    res.status(500).json({ message: "Failed to fetch photo gallery" });
  }
};
export const deletePhotoGallery = async (req, res) => {
  try {
    const { id } = req.params;
    const gallery = await PhotoGallery.findById(id);
    if (!gallery) {
      return res.status(404).json({ message: "Photo gallery not found" });
    }

    await PhotoGallery.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Photo gallery deleted" });
  } catch (error) {
    console.error("Delete PhotoGallery Error:", error);
    res.status(500).json({ message: "Failed to delete photo gallery" });
  }
};

export const getAllPhotoGalleries = async (req, res) => {
  try {
    const galleries = await PhotoGallery.find().sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, data: galleries });
  } catch (error) {
    console.error("Get All PhotoGalleries Error:", error);
    res.status(500).json({ message: "Failed to fetch photo galleries" });
  }
};

export const updatePhotoGallery = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, image, buttonText, redirectionLink } = req.body;

    const gallery = await PhotoGallery.findById(id);
    if (!gallery) {
      return res.status(404).json({ message: "Photo gallery not found" });
    }

    // If a new base64 image is provided, upload and replace the imageUrl
    if (image && image.startsWith("data:image/")) {
      gallery.imageUrl = await uploadBase64Image(image, "gallery-images/");
    }

    if (title !== undefined) gallery.title = title;
    if (buttonText !== undefined) gallery.buttonText = buttonText;
    if (redirectionLink !== undefined)
      gallery.redirectionLink = redirectionLink;

    await gallery.save();

    res
      .status(200)
      .json({ success: true, message: "Photo gallery updated", data: gallery });
  } catch (error) {
    console.error("Update PhotoGallery Error:", error);
    res.status(500).json({ message: "Failed to update photo gallery" });
  }
};
