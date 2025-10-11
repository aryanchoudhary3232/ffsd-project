const express = require("express");
const router = express.Router();
const CourseController = require("../controllers/course.controller");
const {
  isAuthenticated,
  isInstructor,
} = require("../controllers/auth.controller");
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

// Public routes
router.get("/", CourseController.getAllCourses);
router.get("/featured", CourseController.getFeatured);
router.get("/search", CourseController.searchCourses);
router.get("/:slug", CourseController.getCourseBySlug);

// Protected routes
router.post(
  "/",
  isAuthenticated,
  isInstructor,
  upload.single("coverImage"),
  CourseController.createCourse
);
router.put(
  "/:courseId",
  isAuthenticated,
  isInstructor,
  upload.single("coverImage"),
  CourseController.updateCourse
);
router.delete(
  "/:courseId",
  isAuthenticated,
  isInstructor,
  CourseController.deleteCourse
);

// Instructor routes
router.get(
  "/instructor/courses",
  isAuthenticated,
  isInstructor,
  CourseController.getInstructorCourses
);

// Lesson routes
router.post(
  "/:courseId/lessons",
  isAuthenticated,
  isInstructor,
  CourseController.addLesson
);
router.put(
  "/:courseId/lessons/:lessonId",
  isAuthenticated,
  isInstructor,
  CourseController.updateLesson
);
router.delete(
  "/:courseId/lessons/:lessonId",
  isAuthenticated,
  isInstructor,
  CourseController.deleteLesson
);

// Enrollment routes
router.post(
  "/:courseId/enroll",
  isAuthenticated,
  CourseController.enrollInCourse
);
router.get(
  "/user/enrolled",
  isAuthenticated,
  CourseController.getEnrolledCourses
);

module.exports = router;
