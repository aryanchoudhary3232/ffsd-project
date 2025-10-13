const express = require("express")
const router = express.Router()
const UserController = require("../controllers/user.controller")
const { isAuthenticated } = require("../middleware/auth.middleware")

// Student dashboard
router.get("/dashboard", isAuthenticated, UserController.getStudentDashboard)
router.get("/dashboard/data", isAuthenticated, UserController.getStudentDashboardData)

// User profile
router.get("/profile", isAuthenticated, UserController.getUserProfile)
router.post("/profile", isAuthenticated, UserController.updateUserProfile) // Handle both profile and password updates

// User's enrolled courses
router.get("/courses", isAuthenticated, UserController.getUserCourses)

module.exports = router

