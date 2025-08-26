import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const brandSchema = new Schema(
    {
        brandName: {
            type: String,
            required: true,
            trim: true,
        },
        tagline: {
            type: String,
            trim: true,
            maxlength: 80,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        termsAndConditions: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            required: true,
        },
        imageUrl: {
            type: String,
            required: true,
        },
         warehouse: {
              type: Schema.Types.ObjectId,
              ref: "Warehouse",
            },
    },
    { timestamps: true }
);

const Brand = model('Brand', brandSchema);

export default Brand;
