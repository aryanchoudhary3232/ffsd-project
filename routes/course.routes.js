const express = require("express");
const router = express.Router();
const CourseController = require("../controllers/course.controller");
const RatingController = require("../controllers/rating.controller");
const { isAuthenticated } = require("../middleware/auth.middleware");

// Course listings
router.get("/", CourseController.getAllCourses);

// Filter and search courses (used by fetch)
router.post("/filter", CourseController.filterCourses);


router.get("/:id", CourseController.getCourseDetails);

// Course Learning
router.get(
  "/:id/learn",
  isAuthenticated,
  CourseController.getCourseLearningPage
);
router.post(
  "/:courseId/lessons/:lessonId/complete",
  isAuthenticated,
  CourseController.markLessonAsComplete
);

// Course Comments
router.post(
  "/:courseId/lessons/:lessonId/comments",
  isAuthenticated,
  CourseController.addComment
);
router.get(
  "/:courseId/lessons/:lessonId/comments",
  CourseController.getComments
);

// Course Ratings
router.post(
  "/:courseId/ratings",
  isAuthenticated,
  RatingController.submitRating
);
router.get("/:courseId/ratings", RatingController.getCourseRatings);
router.get(
  "/:courseId/ratings/user",
  isAuthenticated,
  RatingController.getUserRating
);
router.delete(
  "/:courseId/ratings/:ratingId",
  isAuthenticated,
  RatingController.deleteRating
);

module.exports = router;
