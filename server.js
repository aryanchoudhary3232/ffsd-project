const express = require("express");
const path = require("path");
// const fs = require("fs"); // Removed fs
const { mongoose } = require("./config/database"); // Import mongoose from database
const session = require("express-session");
const multer = require("multer");
// const bcrypt = require("bcryptjs"); // Keep if needed elsewhere, otherwise remove
const methodOverride = require("method-override");
const flash = require("connect-flash");

// Import and initialize indexes after connection is established
const { initializeIndexes } = require("./scripts/init-indexes");

// Wait for MongoDB connection before initializing indexes
mongoose.connection.once("open", async () => {
  try {
    await initializeIndexes();
    console.log("Database indexes initialized successfully");
  } catch (err) {
    console.error("Error initializing indexes:", err);
  }
});

// Import routes
const authRoutes = require("./routes/auth.routes");
const courseRoutes = require("./routes/course.routes");
const userRoutes = require("./routes/user.routes");
const adminRoutes = require("./routes/admin.routes");
const instructorRoutes = require("./routes/instructor.routes");
const cartRoutes = require("./routes/cart.routes");
const apiRoutes = require("./routes/api.routes"); // Add API routes

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Set up EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true })); // Replaced bodyParser
app.use(express.json()); // Replaced bodyParser
app.use(methodOverride("_method"));
app.use(
  session({
    secret: "seekobharat-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
  })
);
// app.use(express.static("public")); // This is redundant with the one above
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

// Helper function to read data.json - REMOVED
// function readData() { ... }

// Helper function to write to data.json - REMOVED
// function writeData(data) { ... }

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
app.use("/api", apiRoutes); // API routes for SPA
app.use("/", authRoutes);
app.use("/courses", courseRoutes);
app.use("/user", userRoutes);
app.use("/admin", adminRoutes);
app.use("/instructor", instructorRoutes);
app.use("/cart", cartRoutes);

// Home page - serve SPA
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// SPA route - catch all other routes and serve the SPA
app.get("/spa", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Legacy EJS home page (keep for compatibility)
app.get("/legacy", async (req, res) => {
  try {
    const CourseModel = require("./models/course.model");
    const featuredCourses = await CourseModel.getFeaturedCourses();
    res.render("index", { featuredCourses });
  } catch (error) {
    console.error("Error fetching featured courses:", error);
    res.render("index", { featuredCourses: [] });
  }
});

// About Us Page
app.get("/about", (req, res) => {
  res.render("about_us");
});

// Contact Us Page
app.get("/contact-us", (req, res) => {
  res.render("contact_us");
});

// Contact form submission handler
app.post("/contact-us/submit", async (req, res) => {
  // Make async for DB operations
  // Extract form data
  const { name, email, subject, message } = req.body;

  // Basic validation
  if (!name || !email || !subject || !message) {
    req.flash("error_msg", "Please fill in all fields");
    return res.redirect("/contact-us");
  }

  // Email validation using simple regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    req.flash("error_msg", "Please provide a valid email address");
    return res.redirect("/contact-us");
  }

  // Log the inquiry (optional, good for debugging)
  console.log("Contact Form Submission Received:", { name, email, subject });

  try {
    // TODO: Integrate with a Mongoose model to save the contact message
    // Example (assuming you create a Contact model):
    // const Contact = require('./models/contact.model');
    // const newContactMessage = new Contact({ name, email, subject, message });
    // await newContactMessage.save();

    // Flash success messages
    req.flash(
      "success_msg",
      "Thank you for your message. We'll be in touch soon!"
    );
    // Optionally add email confirmation message if you implement sending emails
    // req.flash("success_msg", "A confirmation email has been sent to your email address.");

    res.redirect("/contact-us");
  } catch (error) {
    console.error("Error handling contact form:", error);
    req.flash(
      "error_msg",
      "There was a problem submitting your message. Please try again later."
    );
    res.redirect("/contact-us");
  }
});

// 404 page
app.use((req, res) => {
  res.status(404).render("error", { message: "Page not found" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
