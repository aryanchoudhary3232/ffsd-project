const express = require("express");
const router = express.Router();
const AdminController = require("../controllers/admin.controller");
const { isAuthenticated, isAdmin } = require("../middleware/auth.middleware");
const multer = require("multer");
const path = require("path");

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../public/uploads/"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

router.get(
  "/dashboard",
  isAuthenticated,
  isAdmin,
  AdminController.getAdminDashboard
);

// API endpoint for dashboard data (for fetch requests)
router.get(
  "/api/dashboard",
  isAuthenticated,
  isAdmin,
  AdminController.getDashboardAPI
);

router.get("/users", isAuthenticated, isAdmin, AdminController.getUsers);

// API endpoint for users data (for fetch requests)
router.get("/api/users", isAuthenticated, isAdmin, AdminController.getUsersAPI);

// API endpoint for courses data (for fetch requests)
router.get(
  "/api/courses",
  isAuthenticated,
  isAdmin,
  AdminController.getCoursesAPI
);

// API endpoint for course details (for fetch requests)
router.get(
  "/api/courses/:id/details",
  isAuthenticated,
  isAdmin,
  AdminController.getCourseDetailsAPI
);

// API endpoint for course edit form data (for fetch requests)
router.get(
  "/api/courses/:id/edit",
  isAuthenticated,
  isAdmin,
  AdminController.getEditCourseFormAPI
);

// API endpoint for new course form data (for fetch requests)
router.get(
  "/api/courses/new",
  isAuthenticated,
  isAdmin,
  AdminController.getNewCourseFormAPI
);

// API endpoint for user details (for fetch requests)
router.get(
  "/api/users/:id",
  isAuthenticated,
  isAdmin,
  AdminController.getUserDetailsAPI
);

// API endpoint for user edit form data (for fetch requests)
router.get(
  "/api/users/:id/edit",
  isAuthenticated,
  isAdmin,
  AdminController.getEditUserFormAPI
);

// Admin profile routes
router.get(
  "/profile",
  isAuthenticated,
  isAdmin,
  AdminController.getAdminProfile
);

// API endpoint for admin profile data (for fetch requests)
router.get(
  "/api/profile",
  isAuthenticated,
  isAdmin,
  AdminController.getAdminProfileAPI
);

// Admin profile update route
router.put(
  "/profile",
  isAuthenticated,
  isAdmin,
  AdminController.updateAdminProfile
);

// API endpoint for revenue data (for fetch requests)
router.get(
  "/api/revenue",
  isAuthenticated,
  isAdmin,
  AdminController.getRevenueAPI
);

// Add new route for user details
router.get(
  "/users/:id",
  isAuthenticated,
  isAdmin,
  AdminController.getUserDetails
);

router.get(
  "/users/:id/edit",
  isAuthenticated,
  isAdmin,
  AdminController.getEditUserForm
);
router.put("/users/:id", isAuthenticated, isAdmin, AdminController.updateUser);
router.delete(
  "/users/:id",
  isAuthenticated,
  isAdmin,
  AdminController.deleteUser
);
router.get("/courses", isAuthenticated, isAdmin, AdminController.getCourses);
router.get(
  "/courses/new",
  isAuthenticated,
  isAdmin,
  AdminController.getNewCourseForm
);
router.post(
  "/courses",
  isAuthenticated,
  isAdmin,
  upload.single("thumbnail"),
  AdminController.createCourse
);
router.get(
  "/courses/:id",
  isAuthenticated,
  isAdmin,
  AdminController.getCourseDetails
);
router.get(
  "/courses/:id/edit",
  isAuthenticated,
  isAdmin,
  AdminController.getEditCourseForm
);
router.put(
  "/courses/:id",
  isAuthenticated,
  isAdmin,
  upload.single("thumbnail"),
  AdminController.updateCourse
);
router.put(
  "/courses/:id/featured",
  isAuthenticated,
  isAdmin,
  AdminController.updateCourseFeatured
);
router.delete(
  "/courses/:id/delete",
  isAuthenticated,
  isAdmin,
  AdminController.deleteCourse
);
router.put(
  "/courses/:id/status",
  isAuthenticated,
  isAdmin,
  AdminController.updateCourseStatus
);
router.delete(
  "/courses/:id",
  isAuthenticated,
  isAdmin,
  AdminController.deleteCourse
);
router.get(
  "/courses/:id/ratings",
  isAuthenticated,
  isAdmin,
  AdminController.getCourseRatings
);
router.get("/orders", isAuthenticated, isAdmin, AdminController.getOrders);
router.put(
  "/orders/:id",
  isAuthenticated,
  isAdmin,
  AdminController.updateOrderStatus
);
router.get("/revenue", isAuthenticated, isAdmin, AdminController.getRevenue);

module.exports = router;
