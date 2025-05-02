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
router.post("/courses/:id", isAuthenticated, isInstructor, InstructorController.updateCourse)

// Course content management
router.get("/courses/:id/content", isAuthenticated, isInstructor, InstructorController.getCourseContentPage)

// Module management
router.post("/courses/:id/modules", isAuthenticated, isInstructor, InstructorController.addModule)
router.put("/courses/:id/modules/:moduleId", isAuthenticated, isInstructor, InstructorController.updateModule)
router.delete("/courses/:id/modules/:moduleId", isAuthenticated, isInstructor, InstructorController.deleteModule)

// Lesson management
router.post("/courses/:courseId/modules/:moduleId/lessons", isAuthenticated, isInstructor, InstructorController.addLesson)
router.put("/courses/:id/modules/:moduleId/lessons/:lessonId", isAuthenticated, isInstructor, InstructorController.updateLesson)
router.delete("/courses/:id/modules/:moduleId/lessons/:lessonId", isAuthenticated, isInstructor, InstructorController.deleteLesson)

// Instructor analytics
router.get("/analytics", isAuthenticated, isInstructor, InstructorController.getInstructorAnalytics)

// Instructor students
router.get("/students", isAuthenticated, isInstructor, InstructorController.getInstructorStudents)

module.exports = router

