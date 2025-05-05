const RatingModel = require("../models/rating.model");
const CourseModel = require("../models/course.model");
const User = require("../models/User");

const RatingController = {
  // Submit or update a rating for a course
  submitRating: async (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { courseId } = req.params;
    const userId = req.session.user.id;
    const { rating, review } = req.body;

    try {
      // Check if the course exists
      const course = await CourseModel.getCourseById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      // Check if user is enrolled in the course
      const user = await User.findById(userId);
      if (
        !user ||
        !user.enrolledCourses ||
        !user.enrolledCourses.some((id) => id.toString() === courseId)
      ) {
        return res.status(403).json({
          success: false,
          message: "You must be enrolled in this course to rate it",
        });
      }

      // Submit or update the rating
      await RatingModel.addOrUpdateRating(userId, courseId, rating, review);

      res.json({
        success: true,
        message: "Rating submitted successfully",
      });
    } catch (error) {
      console.error("Submit Rating error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error submitting rating",
      });
    }
  },

  // Get the current user's rating for a course
  getUserRating: async (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { courseId } = req.params;
    const userId = req.session.user.id;

    try {
      const userRating = await RatingModel.getUserRating(userId, courseId);

      if (userRating) {
        res.json({
          success: true,
          hasRated: true,
          rating: userRating.rating,
          review: userRating.review || "",
        });
      } else {
        res.json({
          success: true,
          hasRated: false,
        });
      }
    } catch (error) {
      console.error("Get User Rating error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error getting user rating",
      });
    }
  },

  // Get all ratings for a course
  getCourseRatings: async (req, res) => {
    const { courseId } = req.params;

    try {
      // Check if the course exists
      const course = await CourseModel.getCourseById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      // Get all ratings for the course
      const ratings = await RatingModel.getCourseRatings(courseId);

      res.json({
        success: true,
        ratings,
      });
    } catch (error) {
      console.error("Get Course Ratings error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error getting course ratings",
      });
    }
  },

  // Delete a rating (for admin/instructor)
  deleteRating: async (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { courseId, ratingId } = req.params;
    const userId = req.session.user.id;
    const userRole = req.session.user.role;

    try {
      // Check if the course exists
      const course = await CourseModel.getCourseById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      // If user is not admin or the instructor of this course
      if (
        userRole !== "admin" &&
        (userRole !== "instructor" || course.instructorId.toString() !== userId)
      ) {
        // User can only delete their own rating
        const rating = await RatingModel.getUserRating(userId, courseId);
        if (!rating || rating._id.toString() !== ratingId) {
          return res.status(403).json({
            success: false,
            message: "You don't have permission to delete this rating",
          });
        }
      }

      // For now, just call deleteRating with userId and courseId
      // In a real system, you'd have a more specific delete by ID method
      const deleted = await RatingModel.deleteRating(userId, courseId);

      if (deleted) {
        res.json({
          success: true,
          message: "Rating deleted successfully",
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Rating not found or already deleted",
        });
      }
    } catch (error) {
      console.error("Delete Rating error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error deleting rating",
      });
    }
  },
};

module.exports = RatingController;
