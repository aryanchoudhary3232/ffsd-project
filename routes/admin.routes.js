const express = require("express")
const router = express.Router()
const AdminController = require("../controllers/admin.controller")
const { isAuthenticated, isAdmin } = require("../middleware/auth.middleware")

// Admin dashboard
router.get("/dashboard", isAuthenticated, isAdmin, AdminController.getAdminDashboard)

// User management
router.get("/users", isAuthenticated, isAdmin, AdminController.getUserManagement)
router.get("/users/:id", isAuthenticated, isAdmin, AdminController.getUserDetails)
router.put("/users/:id", isAuthenticated, isAdmin, AdminController.updateUser)
router.delete("/users/:id", isAuthenticated, isAdmin, AdminController.deleteUser)

// Course management
router.get("/courses", isAuthenticated, isAdmin, AdminController.getCourseManagement)
router.get("/courses/:id", isAuthenticated, isAdmin, AdminController.getCourseDetails)
router.put("/courses/:id", isAuthenticated, isAdmin, AdminController.updateCourse)
router.delete("/courses/:id", isAuthenticated, isAdmin, AdminController.deleteCourse)

// Revenue management
router.get("/revenue", isAuthenticated, isAdmin, AdminController.getRevenueManagement)

module.exports = router

