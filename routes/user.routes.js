const express = require("express")
const router = express.Router()
const UserController = require("../controllers/user.controller")
const { isAuthenticated } = require("../middleware/auth.middleware")

// Student dashboard
router.get("/dashboard", isAuthenticated, UserController.getStudentDashboard)

// User profile
router.get("/profile", isAuthenticated, UserController.getUserProfile)
router.put("/profile", isAuthenticated, UserController.updateUserProfile)

// Change password
router.put("/change-password", isAuthenticated, UserController.changePassword)

// User's enrolled courses
router.get("/courses", isAuthenticated, UserController.getUserCourses)

module.exports = router

