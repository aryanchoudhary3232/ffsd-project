const express = require("express");
const router = express.Router();

// Import controllers
const authController = require("../controllers/auth.controller");
const courseController = require("../controllers/course.controller");
const studentController = require("../controllers/student.controller");
const instructorController = require("../controllers/instructor.controller");
const adminController = require("../controllers/admin.controller");

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.status(401).json({ success: false, message: "Authentication required" });
};

// Middleware to check roles
const isStudent = (req, res, next) => {
  if (req.session.user && req.session.user.role === "student") {
    return next();
  }
  res.status(403).json({ success: false, message: "Student access required" });
};

const isInstructor = (req, res, next) => {
  if (req.session.user && req.session.user.role === "instructor") {
    return next();
  }
  res
    .status(403)
    .json({ success: false, message: "Instructor access required" });
};

const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === "admin") {
    return next();
  }
  res.status(403).json({ success: false, message: "Admin access required" });
};

// Auth routes
router.post("/auth/login", authController.apiLogin);
router.post("/auth/register", authController.apiRegister);
router.post("/auth/logout", authController.apiLogout);
router.get("/auth/status", authController.apiCheckStatus);

// Course routes
router.get("/courses", courseController.apiGetAllCourses);
router.get("/courses/featured", courseController.apiGetFeaturedCourses);
router.get("/courses/search", courseController.apiSearchCourses);
router.get("/courses/:id", courseController.apiGetCourseById);
router.post(
  "/courses/create",
  isAuthenticated,
  courseController.apiCreateCourse
);
router.put("/courses/:id", isAuthenticated, courseController.apiUpdateCourse);
router.delete(
  "/courses/:id",
  isAuthenticated,
  courseController.apiDeleteCourse
);

// Student routes
router.get(
  "/student/stats",
  isAuthenticated,
  isStudent,
  studentController.getStats
);
router.get(
  "/student/enrolled-courses",
  isAuthenticated,
  isStudent,
  studentController.getEnrolledCourses
);
router.get(
  "/student/progress",
  isAuthenticated,
  isStudent,
  studentController.getProgress
);

// Instructor routes
router.get(
  "/instructor/stats",
  isAuthenticated,
  isInstructor,
  instructorController.getStats
);
router.get(
  "/instructor/courses",
  isAuthenticated,
  isInstructor,
  instructorController.getCourses
);
router.get(
  "/instructor/students",
  isAuthenticated,
  isInstructor,
  instructorController.getStudents
);
router.get(
  "/instructor/analytics",
  isAuthenticated,
  isInstructor,
  instructorController.getAnalytics
);

// Admin routes
router.get("/admin/stats", isAuthenticated, isAdmin, adminController.getStats);
router.get("/admin/users", isAuthenticated, isAdmin, adminController.getUsers);
router.get(
  "/admin/courses",
  isAuthenticated,
  isAdmin,
  adminController.getCourses
);
router.get(
  "/admin/analytics",
  isAuthenticated,
  isAdmin,
  adminController.getAnalytics
);
router.post(
  "/admin/users/create",
  isAuthenticated,
  isAdmin,
  adminController.createUser
);

// Contact route
router.post("/contact", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Basic validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Here you would typically save to database or send email
    console.log("Contact form submission:", { name, email, subject, message });

    res.json({
      success: true,
      message: "Thank you for your message. We'll be in touch soon!",
    });
  } catch (error) {
    console.error("Contact form error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while processing your request",
    });
  }
});

module.exports = router;
