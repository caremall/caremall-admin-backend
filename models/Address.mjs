import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const addressSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        fullName: {
            type: String,
            required: true,
            trim: true,
        },

        phone: {
            type: String,
            required: true,
        },

        alternatePhone: {
            type: String,
            default: '',
        },

        addressLine1: {
            type: String,
            required: true,
        },

        addressLine2: {
            type: String,
            default: '',
        },

        landmark: {
            type: String,
            default: '',
        },

        district: {
            type: String,
            required: true,
        },

        city: {
            type: String,
            required: true,
        },

        state: {
            type: String,
            required: true,
        },

        postalCode: {
            type: String,
            required: true,
        },

        country: {
            type: String,
            required: true,
            default: 'India',
        },

        mapLocation: {
            type: {
                lat: { type: Number },
                lng: { type: Number }
            },
            default: null
        },

        addressType: {
            type: String,
            enum: ['billing', 'delivery'],
            required: true,
        },

        label: {
            type: String,
            enum: ['home', 'work', 'other'],
            default: 'home',
        },

        isDefault: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

export default model('Address', addressSchema);
