import mongoose from "mongoose";
import Pin from "../../models/PinCode.mjs";

// Create a new Pin
export const createPin = async (req, res) => {
    try {
        const { pincode, location, district, state } = req.body;

        if (!pincode || !location || !district || !state) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const existingPin = await Pin.findOne({ pincode });
        if (existingPin) {
            return res.status(409).json({ message: "Pincode already exists" });
        }

        const pin = await Pin.create({ pincode, location, district, state });

        res.status(201).json({ message: "Pin created successfully", pin });
    } catch (error) {
        console.error("Create Pin Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get all Pins
export const getPins = async (req, res) => {
    try {
        const pins = await Pin.find().sort({ pincode: 1 });
        res.status(200).json(pins);
    } catch (error) {
        console.error("Get Pins Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get a single Pin by ID
export const getPinById = async (req, res) => {
    try {
        const { id } = req.params;
        const pin = await Pin.findById(id);
        if (!pin) return res.status(404).json({ message: "Pin not found" });
        res.status(200).json(pin);
    } catch (error) {
        console.error("Get Pin Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Update a Pin by ID
export const updatePin = async (req, res) => {
    try {
        const { id } = req.params;
        const { pincode, location, district, state } = req.body;

        const pin = await Pin.findById(id);
        if (!pin) return res.status(404).json({ message: "Pin not found" });

        if (pincode) pin.pincode = pincode;
        if (location) pin.location = location;
        if (district) pin.district = district;
        if (state) pin.state = state;

        await pin.save();

        res.status(200).json({ message: "Pin updated successfully", pin });
    } catch (error) {
        console.error("Update Pin Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Delete a Pin by ID
export const deletePin = async (req, res) => {
    try {
        const { id } = req.params;
        const pin = await Pin.findByIdAndDelete(id);
        if (!pin) return res.status(404).json({ message: "Pin not found" });

        res.status(200).json({ message: "Pin deleted successfully" });
    } catch (error) {
        console.error("Delete Pin Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
