import FinanceAdmin from "../../models/finance/FinanceAdmin.mjs";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// Generate JWT
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "7d",
  });
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

    const user = await FinanceAdmin.findOne({ email }).select("+password");

    // Check if user exists
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Account is inactive. Contact administrator." });
    }

    // Validate password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // Generate JWT
    const token = generateToken(user._id, user.role);

    // Prepare admin object without password
    const { _id, name, role, isActive } = user;
    const admin = { _id, name, email: user.email, role, isActive };

    res.status(200).json({
      success: true,
      message: "Login successful",
      admin,
      token
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

// Update Finance Admin
export const updateFinanceAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, isActive } = req.body;

    const user = await FinanceAdmin.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Update fields if provided
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (typeof isActive === "boolean") user.isActive = isActive;

    // Only update password if explicitly provided
    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    // Save updated user
    await user.save();

    res.status(200).json({
      success: true,
      message: "Finance admin updated successfully",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// Delete Finance Admin
export const deleteFinanceAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await FinanceAdmin.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await user.deleteOne();

    res
      .status(200)
      .json({ success: true, message: "Finance admin deleted successfully" });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get All Finance Admins
export const getAllFinanceAdmins = async (req, res) => {
  try {
    const admins = await FinanceAdmin.find().select("-password");

    res.status(200).json({
      success: true,
      count: admins.length,
      data: admins,
    });
  } catch (error) {
    console.error("Get All Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get Finance Admin by ID (includes password)
export const getFinanceAdminById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await FinanceAdmin.findById(id)
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      data: user, // includes hashed password
    });
  } catch (error) {
    console.error("Get By ID Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
