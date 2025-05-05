const { ObjectId } = require("mongodb");
const { getDb } = require("../config/database");
const Course = require("./course.model");
const User = require("./User");

// Helper function to get collections
const getCollections = () => {
  const db = getDb();
  return {
    ratings: db.collection("ratings"),
    courses: db.collection("courses"),
    users: db.collection("users"),
  };
};

// Rating model
const RatingModel = {
  // Submit a new rating or update existing rating
  addOrUpdateRating: async (userId, courseId, rating, review = "") => {
    if (!userId || !courseId) {
      throw new Error("User ID and Course ID are required");
    }

    const { ratings, courses } = getCollections();
    const userObjId = ObjectId.isValid(userId) ? new ObjectId(userId) : userId;
    const courseObjId = ObjectId.isValid(courseId)
      ? new ObjectId(courseId)
      : courseId;

    // Validate rating value
    rating = parseInt(rating);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    // Get user info for the username
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if course exists
    const course = await courses.findOne({ _id: courseObjId });
    if (!course) {
      throw new Error("Course not found");
    }

    // Check if user has already rated this course
    const existingRating = await ratings.findOne({
      userId: userObjId,
      courseId: courseObjId,
    });

    let result;
    const now = new Date();

    if (existingRating) {
      // Update existing rating
      result = await ratings.updateOne(
        { _id: existingRating._id },
        {
          $set: {
            rating,
            review,
            updatedAt: now,
          },
        }
      );
    } else {
      // Create new rating
      const newRating = {
        userId: userObjId,
        courseId: courseObjId,
        username: user.username || user.name || user.email || "Anonymous User",
        rating,
        review,
        createdAt: now,
        updatedAt: now,
      };

      result = await ratings.insertOne(newRating);
    }

    // Update course's average rating
    await RatingModel.updateCourseAverageRating(courseId);

    return existingRating || { rating, review };
  },

  // Get a user's rating for a specific course
  getUserRating: async (userId, courseId) => {
    if (!userId || !courseId) {
      throw new Error("User ID and Course ID are required");
    }

    const { ratings } = getCollections();
    const userObjId = ObjectId.isValid(userId) ? new ObjectId(userId) : userId;
    const courseObjId = ObjectId.isValid(courseId)
      ? new ObjectId(courseId)
      : courseId;

    return await ratings.findOne({
      userId: userObjId,
      courseId: courseObjId,
    });
  },

  // Get all ratings for a course
  getCourseRatings: async (courseId) => {
    if (!courseId) {
      throw new Error("Course ID is required");
    }

    const { ratings } = getCollections();
    const courseObjId = ObjectId.isValid(courseId)
      ? new ObjectId(courseId)
      : courseId;

    return await ratings
      .find({ courseId: courseObjId })
      .sort({ createdAt: -1 })
      .toArray();
  },

  // Delete a rating
  deleteRating: async (userId, courseId) => {
    if (!userId || !courseId) {
      throw new Error("User ID and Course ID are required");
    }

    const { ratings } = getCollections();
    const userObjId = ObjectId.isValid(userId) ? new ObjectId(userId) : userId;
    const courseObjId = ObjectId.isValid(courseId)
      ? new ObjectId(courseId)
      : courseId;

    // Delete the rating
    const result = await ratings.deleteOne({
      userId: userObjId,
      courseId: courseObjId,
    });

    // Update course's average rating
    if (result.deletedCount > 0) {
      await RatingModel.updateCourseAverageRating(courseId);
    }

    return result.deletedCount > 0;
  },

  // Update course's average rating
  updateCourseAverageRating: async (courseId) => {
    if (!courseId) {
      throw new Error("Course ID is required");
    }

    const { ratings, courses } = getCollections();
    const courseObjId = ObjectId.isValid(courseId)
      ? new ObjectId(courseId)
      : courseId;

    // Get all ratings for this course
    const courseRatings = await ratings
      .find({ courseId: courseObjId })
      .toArray();

    // Calculate average rating
    let averageRating = 0;
    if (courseRatings.length > 0) {
      const sum = courseRatings.reduce(
        (total, rating) => total + rating.rating,
        0
      );
      averageRating = sum / courseRatings.length;
    }

    // Update course with new average rating
    await courses.updateOne(
      { _id: courseObjId },
      {
        $set: {
          rating: parseFloat(averageRating.toFixed(1)),
          ratingCount: courseRatings.length,
          updatedAt: new Date(),
        },
      }
    );

    return {
      averageRating: parseFloat(averageRating.toFixed(1)),
      ratingCount: courseRatings.length,
    };
  },
};

module.exports = RatingModel;
