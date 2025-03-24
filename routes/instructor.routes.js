const express = require("express")
const router = express.Router()
const InstructorController = require("../controllers/instructor.controller")
const { isAuthenticated, isInstructor } = require("../middleware/auth.middleware")

// Instructor dashboard
router.get("/dashboard", isAuthenticated, isInstructor, InstructorController.getInstructorDashboard)

// Instructor courses
router.get("/courses", isAuthenticated, isInstructor, InstructorController.getInstructorCourses)

// Create course
router.get("/courses/new", isAuthenticated, isInstructor, InstructorController.getCreateCourseForm)
router.post("/courses/new", isAuthenticated, isInstructor, InstructorController.createCourse)

// Edit course
router.get("/courses/:id/edit", isAuthenticated, isInstructor, InstructorController.getEditCourseForm)
router.put("/courses/:id", isAuthenticated, isInstructor, InstructorController.updateCourse)

// Course content management
router.get("/courses/:id/content", isAuthenticated, isInstructor, InstructorController.getCourseContentPage)
router.post("/courses/:id/modules", isAuthenticated, isInstructor, InstructorController.addModule)
router.post(
  "/courses/:courseId/modules/:moduleId/lessons",
  isAuthenticated,
  isInstructor,
  InstructorController.addLesson,
)

// Instructor analytics
router.get("/analytics", isAuthenticated, isInstructor, InstructorController.getInstructorAnalytics)

// Instructor students
router.get("/students", isAuthenticated, isInstructor, InstructorController.getInstructorStudents)

module.exports = router

