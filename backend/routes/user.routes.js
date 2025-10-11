const express = require("express");
const router = express.Router();
const UserController = require("../controllers/user.controller");
const { isAuthenticated, isAdmin } = require("../controllers/auth.controller");
const multer = require("multer");
const path = require("path");

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../public/uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});

// Protected routes
router.get("/profile", isAuthenticated, UserController.getUserProfile);
router.get("/profile/:userId", isAuthenticated, UserController.getUserProfile);
router.put(
  "/profile",
  isAuthenticated,
  upload.single("profilePicture"),
  UserController.updateUserProfile
);
router.put(
  "/profile/:userId",
  isAuthenticated,
  isAdmin,
  upload.single("profilePicture"),
  UserController.updateUserProfile
);
router.post("/change-password", isAuthenticated, UserController.changePassword);
router.delete("/delete", isAuthenticated, UserController.deleteUser);
router.delete(
  "/delete/:userId",
  isAuthenticated,
  isAdmin,
  UserController.deleteUser
);

// Admin routes
router.get("/all", isAuthenticated, isAdmin, UserController.getAllUsers);
router.put(
  "/:userId/role",
  isAuthenticated,
  isAdmin,
  UserController.updateUserRole
);

// Dashboard
router.get("/dashboard", isAuthenticated, UserController.getUserDashboard);

module.exports = router;
