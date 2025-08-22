import Highlight from "../../models/Highlight.mjs";

export const createHighlight = async (req, res) => {
    try {
        const { product, video } = req.body;

        if (!product || !video) {
            return res.status(400).json({ message: "Product ID and video URL are required" });
        }

        const highlight = await Highlight.create({
            product,
            video,
        });

        res.status(201).json({ message: "Highlight created", highlight });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to create highlight", error: error.message });
    }
};


export const getHighlights = async (req, res) => {
    try {
        const highlights = await Highlight.find().populate('product').lean();
        res.status(200).json(highlights);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch highlights", error: error.message });
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
        res.status(500).json({ message: "Failed to delete highlight", error: error.message });
    }
};