import mongoose from "mongoose";

const { Schema } = mongoose;

const productHighlightSchema = new Schema(
    {
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        video: { type: String, required: true },
    },
    { timestamps: true }
);

const highlight = mongoose.model("Highlight", productHighlightSchema);

export default highlight
