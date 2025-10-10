import jwt from "jsonwebtoken";
import Admin from "../models/Admin.mjs";
import User from "../models/User.mjs";
import FinanceAdmin from "../models/finance/FinanceAdmin.mjs";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;

export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized", auth: false });
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(token, ACCESS_TOKEN_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: "Forbidden", auth: false });
      }

      const admin = await Admin.findById(decoded._id)
        .populate("role")
        .populate("assignedWarehouses")
        .select("-password -encryptedPassword");

      if (!admin) {
        return res
          .status(403)
          .json({ message: "Admin not found", auth: false });
      }

      if (admin.status !== "active") {
        return res
          .status(403)
          .json({ auth: false, message: "You are banned from website" });
      }

      req.user = admin;

      next();
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, error_msg: "Internal server error" });
  }
};

export const verifyUserToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = await User.findById(decoded?.userId).select("-password");
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token expired or invalid" });
  }
};

export const verifyFinanceAdminToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ success: false, message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.FINANCE_JWT_SECRET);
    req.user = await FinanceAdmin.findById(decoded.id).select("-password");
    if (!req.user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};
