import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const productTypeSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    attributes: [
        {
            name: { type: String, required: true }, // e.g., "Size", "Color"
            values: [{ type: String, required: true }] // e.g., ["S", "M", "L"]
        }
    ]
}, {
    timestamps: true
});

export default model('ProductType', productTypeSchema);
