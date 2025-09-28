import DeliveryBoy from "../../models/DeliveryBoy.mjs";
import { generateAccessToken, generateRefreshToken } from "../../utils/generateTokens.mjs";
import { uploadBase64Image } from "../../utils/uploadImage.mjs";

// CREATE a new delivery boy
export const createDeliveryBoy = async (req, res) => {
  try {
    const { name, phone, email, password, avatar } = req.body;

    // Check for required fields
    if (!name || !phone || !email || !password) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // Check uniqueness
    const exists = await DeliveryBoy.findOne({ email });
    if (exists)
      return res.status(409).json({ message: "Email already exists" });

    // Upload avatar image if provided as base64
    let avatarUrl = "";
    if (avatar) {
      avatarUrl = await uploadBase64Image(avatar, "avatars/");
    }

    // Create delivery boy record with avatar URL if uploaded
    const deliveryBoy = new DeliveryBoy({
      name,
      phone,
      email,
      password, // will be hashed in schema pre-save hook
      avatar: avatarUrl,
    });

    const saved = await deliveryBoy.save();
    saved.password = undefined; // Hide password in response

    res.status(201).json(saved);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create delivery boy" });
  }
};

// READ all delivery boys
export const getAllDeliveryBoys = async (req, res) => {
  try {
    // Build filter object based on query params
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.isBlocked) filter.isBlocked = req.query.isBlocked === "true";
    if (req.query.phone) filter.phone = req.query.phone;
    if (req.query.email) filter.email = req.query.email;

    const deliveryBoys = await DeliveryBoy.find(filter);
    res.status(200).json(deliveryBoys);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// READ one delivery boy by id
export const getDeliveryBoyById = async (req, res) => {
  try {
    const deliveryBoy = await DeliveryBoy.findById(req.params.id);
    if (!deliveryBoy) return res.status(404).json({ message: "Not found" });
    res.status(200).json(deliveryBoy);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE delivery boy by id
export const updateDeliveryBoy = async (req, res) => {
  try {
    const updated = await DeliveryBoy.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE delivery boy by id
export const deleteDeliveryBoy = async (req, res) => {
  try {
    const deleted = await DeliveryBoy.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.status(200).json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const loginDeliveryBoy = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email and Password are required" });

    const deliveryBoy = await DeliveryBoy.findOne({ email });

    if (!deliveryBoy)
      return res.status(404).json({ message: "Delivery boy not found" });

    const isMatch = await bcrypt.compare(password, deliveryBoy.password);

    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = generateAccessToken(deliveryBoy);
    const refreshToken = generateRefreshToken(deliveryBoy);

    // Send refresh token in cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    deliveryBoy.password = undefined; // Remove password from response

    res.status(200).json({
      message: "Login successful",
      deliveryBoy,
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
