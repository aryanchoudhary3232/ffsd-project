const express = require("express");
const router = express.Router();
const AdminController = require("../controllers/admin.controller");
const { isAuthenticated, isAdmin } = require("../controllers/auth.controller");

// All admin routes require authentication and admin role
router.use(isAuthenticated);
router.use(isAdmin);

// Dashboard
router.get("/dashboard", AdminController.getDashboardStats);

// User management
router.get("/users", AdminController.getAllUsers);
router.put("/users/:userId/role", AdminController.updateUserRole);
router.delete("/users/:userId", AdminController.deleteUser);

// Course management
router.get("/courses", AdminController.getAllCourses);
router.put("/courses/:courseId/status", AdminController.updateCourseStatus);
router.delete("/courses/:courseId", AdminController.deleteCourse);

// Settings
router.get("/settings", AdminController.getSettings);
router.put("/settings", AdminController.updateSettings);

module.exports = router;
