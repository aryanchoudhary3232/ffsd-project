const express = require("express")
const router = express.Router()
const CourseController = require("../controllers/course.controller")
const { isAuthenticated } = require("../middleware/auth.middleware")

// Get all courses
router.get("/", CourseController.getAllCourses)

// Get course details
router.get("/:id", CourseController.getCourseDetails)

// Enroll in course
router.post("/:id/enroll", isAuthenticated, CourseController.enrollInCourse)

// Course learning page
router.get("/:id/learn", isAuthenticated, CourseController.getCourseLearningPage)

// Mark lesson as complete
router.post("/:courseId/lessons/:lessonId/complete", isAuthenticated, CourseController.markLessonAsComplete)

module.exports = router

