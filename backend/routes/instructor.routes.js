const express = require("express");
const router = express.Router();
const {
  isAuthenticated,
  isInstructor,
} = require("../controllers/auth.controller");
const UserController = require("../controllers/user.controller");
const CourseController = require("../controllers/course.controller");

// Instructor dashboard
router.get(
  "/dashboard",
  isAuthenticated,
  isInstructor,
  UserController.getUserDashboard
);

// Instructor courses
router.get(
  "/courses",
  isAuthenticated,
  isInstructor,
  CourseController.getInstructorCourses
);

module.exports = router;
