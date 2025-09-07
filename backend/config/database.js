const mongoose = require("mongoose");

// Allow configuration via environment variables
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/seekobharat";

// MongoDB connection
mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message || err);
  });

module.exports = { mongoose, MONGODB_URI };
