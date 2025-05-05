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
router.get("/users", isAuthenticated, isAdmin, AdminController.getUsers);

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
  "/courses/:id/edit-course",
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
