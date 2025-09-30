// models/pin.mjs
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const pinSchema = new Schema(
    {
        pincode: {
            type: [Number],
            required: true,
            unique: true,
            index: true, // makes searching faster
        },
        location: {
            type: String,
            required: true,
            trim: true,
        },
        district: {
            type: String,
            required: true,
            trim: true,
        },
        state: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ["active", "blocked"], // only allow these values
            default: "active", // default status
        },
    },
    { timestamps: true }
);

const Pin = model("Pin", pinSchema);
export default Pin;
