const { ObjectId } = require("mongodb");
const { getDb } = require("../config/database");

// Helper function to get collections
const getCollections = () => {
  const db = getDb();
  return {
    comments: db.collection("comments"),
    users: db.collection("users"),
    courses: db.collection("courses"),
  };
};

// Comment model
const CommentModel = {
  // Get comments for a specific lesson
  getCommentsByLesson: async (courseId, lessonId) => {
    const { comments } = getCollections();

    try {
      return await comments
        .find({
          courseId: courseId.toString(),
          lessonId: lessonId.toString(),
        })
        .sort({ createdAt: -1 })
        .toArray();
    } catch (error) {
      console.error("Error getting comments:", error);
      return [];
    }
  },

  // Create a new comment
  createComment: async (commentData) => {
    const { comments, users } = getCollections();

    try {
      // Find the user to get their name
      const user = await users.findOne({
        _id: new ObjectId(commentData.userId),
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Create new comment object
      const newComment = {
        _id: new ObjectId(),
        courseId: commentData.courseId.toString(),
        lessonId: commentData.lessonId.toString(),
        userId: commentData.userId.toString(),
        username: user.name || "Anonymous", // Use user's name or fallback
        comment: commentData.comment,
        createdAt: new Date(),
      };

      // Insert the comment
      await comments.insertOne(newComment);
      return newComment;
    } catch (error) {
      console.error("Error creating comment:", error);
      throw error;
    }
  },

  // Delete a comment (for moderation purposes)
  deleteComment: async (commentId, userId) => {
    const { comments } = getCollections();

    try {
      const result = await comments.deleteOne({
        _id: new ObjectId(commentId),
        userId: userId.toString(),
      });

      return result.deletedCount === 1;
    } catch (error) {
      console.error("Error deleting comment:", error);
      return false;
    }
  },
};

module.exports = CommentModel;
