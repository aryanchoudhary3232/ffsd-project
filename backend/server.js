const express = require("express");
const path = require("path");
const { mongoose } = require("./config/database"); // Ensure DB connects on import
const session = require("express-session");
const MongoStore = require("connect-mongo");
const multer = require("multer");
const methodOverride = require("method-override");
const cors = require("cors");

// Import routes
const apiRoutes = require("./routes/api.routes");

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
const SESSION_SECRET = process.env.SESSION_SECRET || "seekobharat-secret-key";

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));

// CORS configuration - Allow frontend to connect to the API
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);

// Session setup
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl:
        process.env.MONGODB_URI || "mongodb://localhost:27017/seekobharat",
      collectionName: "sessions",
    }),
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "lax",
      secure: false, // set true when behind HTTPS
    },
  })
);

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

// API routes
app.use("/api", apiRoutes);

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "API is running" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Backend API server is running on port ${PORT}`);
  console.log(`http://localhost:${PORT}/health`);
});
