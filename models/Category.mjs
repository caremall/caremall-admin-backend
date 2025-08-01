import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['Main', 'Sub'],
            required: true,
        },
        image: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: '',
            trim: true,
        },
        parentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            default: undefined,
        },
        categoryCode: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
    },
    { timestamps: true }
);

export default mongoose.model('Category', categorySchema);
