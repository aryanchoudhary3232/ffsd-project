const express = require("express");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const session = require("express-session");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const methodOverride = require("method-override");
const flash = require("connect-flash");

// Import routes
const authRoutes = require("./routes/auth.routes");
const courseRoutes = require("./routes/course.routes");
const userRoutes = require("./routes/user.routes");
const adminRoutes = require("./routes/admin.routes");
const instructorRoutes = require("./routes/instructor.routes");
const cartRoutes = require("./routes/cart.routes");

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Set up EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride("_method"));
app.use(
  session({
    secret: "learnhub-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
  })
);
app.use(express.static("public"));
app.use(flash());

// Global middleware
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  next();
});

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

// Helper function to read data.json
function readData() {
  const rawData = fs.readFileSync("data.json");
  return JSON.parse(rawData);
}

// Helper function to write to data.json
function writeData(data) {
  fs.writeFileSync("data.json", JSON.stringify(data, null, 2));
}

// Middleware to check if user is logged in
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect("/login");
}

// Middleware to check if user is an instructor
function isInstructor(req, res, next) {
  if (req.session.user && req.session.user.role === "instructor") {
    return next();
  }
  res.redirect("/dashboard");
}

// Middleware to check if user is an admin
function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === "admin") {
    return next();
  }
  res.redirect("/dashboard");
}

// Routes
app.use("/", authRoutes);
app.use("/courses", courseRoutes);
app.use("/user", userRoutes);
app.use("/admin", adminRoutes);
app.use("/instructor", instructorRoutes);
app.use("/cart", cartRoutes);

// Home page
app.get("/", (req, res) => {
  const courseModel = require("./models/course.model");
  const featuredCourses = courseModel.getFeaturedCourses();
  res.render("index", { featuredCourses });
});

// 404 page
app.use((req, res) => {
  res.status(404).render("error", { message: "Page not found" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
