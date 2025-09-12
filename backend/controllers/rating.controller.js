const Rating = require("../models/Rating");
const Course = require("../models/Course");
const User = require("../models/User");

const RatingController = {
  // Get all ratings for a course
  getCourseRatings: async (req, res) => {
    try {
      const { courseId } = req.params;

      // Check if course exists
      const courseExists = await Course.exists({ _id: courseId });

      if (!courseExists) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      // Get ratings for the course
      const ratings = await Rating.find({ course: courseId })
        .populate("user", "username name profilePicture")
        .sort("-createdAt");

      res.json({
        success: true,
        count: ratings.length,
        data: ratings,
      });
    } catch (error) {
      console.error("Error getting course ratings:", error);
      res.status(500).json({
        success: false,
        message: "Error retrieving course ratings",
        error: error.message,
      });
    }
  },

  // Add a rating to a course
  addRating: async (req, res) => {
    try {
      const { courseId } = req.params;
      const { rating, review } = req.body;
      const userId = req.session.user.id;

      // Check if course exists
      const course = await Course.findById(courseId);

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      // Check if user has already rated this course
      const existingRating = await Rating.findOne({
        course: courseId,
        user: userId,
      });

      if (existingRating) {
        return res.status(400).json({
          success: false,
          message: "You have already rated this course",
        });
      }

      // Create new rating
      const newRating = new Rating({
        course: courseId,
        user: userId,
        rating,
        review,
      });

      await newRating.save();

      // Update course rating
      const allRatings = await Rating.find({ course: courseId });
      const ratingSum = allRatings.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = ratingSum / allRatings.length;

      course.rating = averageRating;
      course.numRatings = allRatings.length;
      course.reviews.push(newRating._id);
      await course.save();

      // Populate user info for response
      const populatedRating = await Rating.findById(newRating._id).populate(
        "user",
        "username name profilePicture"
      );

      res.status(201).json({
        success: true,
        message: "Rating added successfully",
        data: populatedRating,
      });
    } catch (error) {
      console.error("Error adding rating:", error);
      res.status(500).json({
        success: false,
        message: "Error adding rating",
        error: error.message,
      });
    }
  },

  // Update a rating
  updateRating: async (req, res) => {
    try {
      const { ratingId } = req.params;
      const { rating, review } = req.body;
      const userId = req.session.user.id;

      // Find the rating
      const existingRating = await Rating.findById(ratingId);

      if (!existingRating) {
        return res.status(404).json({
          success: false,
          message: "Rating not found",
        });
      }

      // Check if user owns this rating
      if (existingRating.user.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to update this rating",
        });
      }

      // Update rating
      existingRating.rating = rating || existingRating.rating;
      existingRating.review =
        review !== undefined ? review : existingRating.review;
      await existingRating.save();

      // Update course average rating
      const courseId = existingRating.course;
      const allRatings = await Rating.find({ course: courseId });
      const ratingSum = allRatings.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = ratingSum / allRatings.length;

      await Course.findByIdAndUpdate(courseId, {
        rating: averageRating,
        numRatings: allRatings.length,
      });

      // Populate user info for response
      const populatedRating = await Rating.findById(ratingId).populate(
        "user",
        "username name profilePicture"
      );

      res.json({
        success: true,
        message: "Rating updated successfully",
        data: populatedRating,
      });
    } catch (error) {
      console.error("Error updating rating:", error);
      res.status(500).json({
        success: false,
        message: "Error updating rating",
        error: error.message,
      });
    }
  },

  // Delete a rating
  deleteRating: async (req, res) => {
    try {
      const { ratingId } = req.params;
      const userId = req.session.user.id;

      // Find the rating
      const rating = await Rating.findById(ratingId);

      if (!rating) {
        return res.status(404).json({
          success: false,
          message: "Rating not found",
        });
      }

      // Check if user owns this rating or is admin
      if (
        rating.user.toString() !== userId &&
        req.session.user.role !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to delete this rating",
        });
      }

      const courseId = rating.course;

      // Delete rating
      await Rating.findByIdAndDelete(ratingId);

      // Remove from course reviews array
      await Course.findByIdAndUpdate(courseId, {
        $pull: { reviews: ratingId },
      });

      // Update course average rating
      const allRatings = await Rating.find({ course: courseId });

      if (allRatings.length > 0) {
        const ratingSum = allRatings.reduce((sum, r) => sum + r.rating, 0);
        const averageRating = ratingSum / allRatings.length;

        await Course.findByIdAndUpdate(courseId, {
          rating: averageRating,
          numRatings: allRatings.length,
        });
      } else {
        // No ratings left
        await Course.findByIdAndUpdate(courseId, {
          rating: 0,
          numRatings: 0,
        });
      }

      res.json({
        success: true,
        message: "Rating deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting rating:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting rating",
        error: error.message,
      });
    }
  },

  // Get user's ratings
  getUserRatings: async (req, res) => {
    try {
      const userId = req.params.userId || req.session.user.id;

      // Check authorization
      if (
        req.params.userId &&
        req.params.userId !== req.session.user.id &&
        req.session.user.role !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to view these ratings",
        });
      }

      // Get ratings for the user
      const ratings = await Rating.find({ user: userId })
        .populate("course", "title slug coverImage")
        .sort("-createdAt");

      res.json({
        success: true,
        count: ratings.length,
        data: ratings,
      });
    } catch (error) {
      console.error("Error getting user ratings:", error);
      res.status(500).json({
        success: false,
        message: "Error retrieving user ratings",
        error: error.message,
      });
    }
  },
};

module.exports = RatingController;
