function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((val) => {
      // Detect default required error format and rewrite it
      const requiredPattern = /^Path `(.+?)` is required\.$/;
      const match = val.message.match(requiredPattern);
      if (match) {
        const field = capitalize(match[1]);
        return `${field} is required`;
      }
      return val.message;
    });
    return res.status(400).json({ success:false, message: messages.join(", ") });
  }

  res
    .status(err.statusCode || 500)
    .json({ message: err.message || "Internal Server error" });
}
