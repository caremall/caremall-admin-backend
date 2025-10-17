import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Admin from "../../models/Admin.mjs";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../utils/generateTokens.mjs";
import Role from "../../models/Role.mjs";

//⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email and Password are required" });

    const admin = await Admin.findOne({ email })
      .populate("role")
      .populate("assignedWarehouses");

    if (!admin) return res.status(404).json({ message: "Admin not found" });

    if (!admin.assignedWarehouses) {
      return res
        .status(403)
        .json({ message: "Access denied: no warehouse assigned" });
    }

    const role = await Role.findById(admin.role);

    if (
      !role ||
      (role.name !== "warehouseManager")
    ) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = generateAccessToken(admin);
    const refreshToken = generateRefreshToken(admin);

    // Send refresh token in cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    admin.password = undefined; // Remove password from response
    admin.encryptedPassword = undefined; // Remove encrypted password from response

    if (admin.role !== "superAdmin") admin.populate("role");

    res
      .status(200)
      .json({ message: "Login successful", manager: admin, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const refresh = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;

    if (!token)
      return res.status(401).json({ message: "No refresh token provided" });

    jwt.verify(
      token,
      process.env.REFRESH_TOKEN_SECRET,
      async (err, decoded) => {
        if (err)
          return res.status(403).json({ message: "Invalid refresh token" });
        const admin = await Admin.findById(decoded._id).select("-password");

        const token = generateAccessToken(admin);

        res.status(200).json({ message: "Welcome Back Admin", admin, token });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Token refresh failed" });
  }
};

export const logout = async (req, res) => {
  try {
    const cookies = req.cookies;
    if (!cookies?.user) return res.sendStatus(204);
    res
      .clearCookie("user", {
        httpOnly: true,
        sameSite: "None",
        secure: true,
      })
      .json({ success: true });
  } catch (error) {
    console.log(error);
    res.send({ success: false, message: "Internal server error" });
  }
};
export const getLoggedInAdmin = async (req, res) => {
  try {
    const userId = req.user._id; // Assuming authentication middleware sets req.user

    // Fetch user excluding sensitive fields and populate role with permissions
    const user = await Admin.findById(userId)
      .select("-password -encryptedPassword -otp -otpExpires")
      .populate({
        path: "role",
        select: "name permissions description status", 
      })
      .populate({
        path: "assignedWarehouses",
        select: "name code address status", // Select only necessary warehouse fields
      });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    // Check if user role exists and is published
    if (!user.role || user.role.status !== 'published') {
      return res.status(403).json({
        success: false,
        message: "User role is not active or not found"
      });
    }

    // Transform the response to include permissions at the user level for easier access
    const userResponse = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      mobileNumber: user.mobileNumber,
      role: {
        _id: user.role._id,
        name: user.role.name,
        description: user.role.description,
        status: user.role.status
      },
      permissions: user.role.permissions || {}, // Extract permissions from role for easier frontend access
      assignedWarehouses: user.assignedWarehouses || [], // Include assigned warehouses
      notes: user.notes,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(200).json({
      success: true,
      data: userResponse, // Changed from 'user' to 'data' for better API consistency
    });
  } catch (error) {
    console.error("Get Logged In User Details Error:", error);
    
    // More specific error handling
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false,
        message: "Invalid user ID format" 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: "Failed to get user details",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

export const editAdminProfile = async (req, res) => {
  try {
    const adminId = req.user._id; // Assuming auth middleware sets req.admin
    const { name, email, password, role, assignedWarehouses } = req.body;

    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    // Update name
    if (name) admin.name = name.trim();

    // Update email
    if (email && email !== admin.email) {
      const emailExists = await Admin.findOne({ email });
      if (emailExists)
        return res.status(409).json({ message: "Email already in use" });
      admin.email = email.toLowerCase().trim();
    }

    // Update password
    if (password) {
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash(password, salt);
    }

    // Update role (optional, only if superAdmin allows)
    if (role) {
      const roleExists = await Role.findById(role);
      if (!roleExists)
        return res.status(400).json({ message: "Invalid role ID" });
      admin.role = role;
    }

    // Update assigned warehouses (array of IDs)
    if (assignedWarehouses && Array.isArray(assignedWarehouses)) {
      admin.assignedWarehouses = assignedWarehouses;
    }

    await admin.save();

    // Remove sensitive info before sending response
    admin.password = undefined;
    admin.encryptedPassword = undefined;

    res
      .status(200)
      .json({ message: "Profile updated successfully", admin });
  } catch (error) {
    console.error("Edit Admin Profile Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};