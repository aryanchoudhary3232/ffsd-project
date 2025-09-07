const express = require("express");
const router = express.Router();
const {
  AuthController,
  isAuthenticated,
} = require("../controllers/auth.controller");

// Authentication routes
router.post("/login", AuthController.apiLogin);
router.post("/register", AuthController.apiRegister);
router.post("/logout", isAuthenticated, AuthController.apiLogout);
router.get("/check-status", AuthController.apiCheckStatus);
router.get("/status", AuthController.apiCheckStatus);

module.exports = router;
