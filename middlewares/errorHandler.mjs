export default function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res
      .status(400)
      .json({ success: false, message: messages.join(", ") });
  }

  // Mongoose duplicate key error
  if (err.code && err.code === 11000) {
    const field = Object.keys(err.keyValue);
    return res
      .status(400)
      .json({ success: false, message: `${field} already exists` });
  }

  // Default fallback
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Server Error",
  });
}
