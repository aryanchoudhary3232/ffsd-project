const express = require("express")
const router = express.Router()
const AuthController = require("../controllers/auth.controller")

// Login routes
router.get("/login", AuthController.getLoginPage)
router.post("/login", AuthController.login)

// Register routes
router.get("/register", AuthController.getRegisterPage)
router.post("/register", AuthController.register)

// Logout route
router.get("/logout", AuthController.logout)

// Dashboard route
router.get("/dashboard", AuthController.getDashboard)

module.exports = router

