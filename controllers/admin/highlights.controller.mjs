import Highlight from "../../models/Highlight.mjs";
import { uploadBase64Image, uploadBase64Video } from "../../utils/uploadImage.mjs";

export const createHighlight = async (req, res) => {
  try {
    const { product, base64Video, base64Image } = req.body;

    if (!product) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    // Upload video if provided
    let videoUrl = "";
    if (base64Video) {
      videoUrl = await uploadBase64Video(base64Video);
    }

    // Upload a single image if provided
    let imageUrl = "";
    if (base64Image) {
      const uploaded = await uploadBase64Image(
        base64Image,
        "highlight-images/"
      );
      imageUrl = uploaded;
    }

    const highlight = await Highlight.create({
      product,
      video: videoUrl,
      image: imageUrl, 
    });

    res.status(201).json({ message: "Highlight created", highlight });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to create highlight", error: error.message });
  }
};

export const getHighlights = async (req, res) => {
  try {
    const highlights = await Highlight.find().populate("product").lean();
    res.status(200).json(highlights);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to fetch highlights", error: error.message });
  }
};

export const getHighlightById = async (req, res) => {
  try {
    const { id } = req.params;
    const highlight = await Highlight.findById(id).populate("product").lean();
    if (!highlight) {
      return res.status(404).json({ message: "Highlight not found" });
    }
    res.status(200).json(highlight);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to fetch highlight", error: error.message });
  }
};

export const deleteHighlight = async (req, res) => {
  try {
    const { id } = req.params;
    const highlight = await Highlight.findById(id);
    if (!highlight) {
      return res.status(404).json({ message: "Highlight not found" });
    }
    await highlight.deleteOne();
    res.status(200).json({ message: "Highlight deleted successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Failed to delete highlight", error: error.message });
  }
};

export const updateHighlight = async (req, res) => {
  try {
    const { id } = req.params;
    const { product, base64Video, video } = req.body; // either base64Video (new upload) or existing video URL

    if (!id) {
      return res.status(400).json({ message: "Highlight ID is required" });
    }

    const highlight = await Highlight.findById(id);
    if (!highlight) {
      return res.status(404).json({ message: "Highlight not found" });
    }

    if (product) {
      highlight.product = product;
    }

    if (base64Video && base64Video.startsWith("data:video/")) {
      // New base64 video, upload
      const videoUrl = await uploadBase64Video(base64Video);
      highlight.video = videoUrl;
    } else if (video && typeof video === "string" && video.startsWith("http")) {
      // Existing video URL, keep or update
      highlight.video = video;
    }
    // else keep highlight.video as is

    await highlight.save();

    res.status(200).json({ message: "Highlight updated", highlight });
  } catch (error) {
    console.error("Update highlight error:", error);
    res
      .status(500)
      .json({ message: "Failed to update highlight", error: error.message });
  }
};
