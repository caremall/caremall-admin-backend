import mongoose from "mongoose";
import Pin from "../../models/PinCode.mjs";

// Create a new Pin
export const createPin = async (req, res) => {
    try {
        let { pincode, location, district, state, status } = req.body;

        // ✅ basic validations
        if (!pincode || !location || !district || !state) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // ✅ ensure pincode is an array of numbers
        if (!Array.isArray(pincode) || !pincode.every((n) => typeof n === "number")) {
            return res
                .status(400)
                .json({ message: "pincode must be an array of numbers" });
        }

        // ✅ default status if not passed
        if (!status) status = "active";

        // ✅ check if same array of pincodes already exists
        const existingPin = await Pin.findOne({ pincode });
        if (existingPin) {
            return res.status(409).json({ message: "Pincode already exists" });
        }

        // ✅ create new pin doc
        const pin = await Pin.create({
            pincode,
            location,
            district,
            state,
            status,
        });

        res.status(201).json({ message: "Pin created successfully", pin });
    } catch (error) {
        console.error("Create Pin Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get all Pins
export const getPins = async (req, res) => {
    try {
        const { status } = req.query; // get status from query param
        const filter = {};

        if (status) {
            // Only include pins matching the status if provided
            filter.status = status; // assuming your Pin schema has a 'status' field
        }

        const pins = await Pin.find(filter).sort({ pincode: 1 });
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
        const { pincode, location, district, state, status } = req.body;

        const pin = await Pin.findById(id);
        if (!pin) {
            return res.status(404).json({ message: "Pin not found" });
        }

        // If pincode passed, make sure it's an array of numbers
        if (pincode) {
            if (!Array.isArray(pincode) || !pincode.every(n => typeof n === 'number')) {
                return res.status(400).json({ message: "pincode must be an array of numbers" });
            }
            pin.pincode = pincode;
        }

        if (location) pin.location = location;
        if (district) pin.district = district;
        if (state) pin.state = state;

        // update status if provided
        if (status) {
            if (!["active", "blocked"].includes(status)) {
                return res.status(400).json({ message: "status must be either 'active' or 'blocked'" });
            }
            pin.status = status;
        }

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
