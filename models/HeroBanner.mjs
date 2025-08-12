
import mongoose from 'mongoose';

const heroBannerSchema = new mongoose.Schema(
    {
        bannerImage: {
            type: String,
            required: true,
        },
        text: {
            type: String,
            trim: true,
        },
        buttonName: {
            type: String,
            trim: true,
        },
        redirectLink: {
            type: String,
            trim: true,
        },
        sortOrder: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model('HeroBanner', heroBannerSchema);
