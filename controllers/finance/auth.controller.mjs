import FinanceAdmin from "../../models/finance/FinanceAdmin.mjs";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// Generate JWT
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.FINANCE_JWT_SECRET, { expiresIn: "7d" });
};

// Signup
export const registerFinanceAdmin = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await FinanceAdmin.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email already exists" });
    }

    const newUser = await FinanceAdmin.create({ name, email, password, role });
    // const token = generateToken(newUser._id, newUser.role);

    res.status(201).json({
      success: true,
      message: "Finance admin registered successfully",
      data: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        // token,
      },
    });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Login
export const loginFinanceAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await FinanceAdmin.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get current logged-in admin
export const getFinanceAdminProfile = async (req, res) => {
  try {
    const user = await FinanceAdmin.findById(req.user.id).select("-password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("Profile Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
