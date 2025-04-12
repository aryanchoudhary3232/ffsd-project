const { ObjectId } = require("mongodb");
const { getDb } = require("../config/database"); // Assuming getDb returns the MongoDB database instance

// Helper function to get collections
const getCollections = () => {
  const db = getDb();
  return {
    progress: db.collection("progress"),
    courses: db.collection("courses"),
  };
};

// Progress model
const ProgressModel = {
  // Get progress by user and course
  getProgress: async (userId, courseId) => {
    const { progress } = getCollections();
    const userObjectId = new ObjectId(userId);
    const courseObjectId = new ObjectId(courseId);

    return (
      (await progress.findOne({ userId: userObjectId, courseId: courseObjectId })) || {
        userId: userObjectId,
        courseId: courseObjectId,
        progress: 0,
        completedLessons: [],
      }
    );
  },

  // Mark lesson as complete
  markLessonAsComplete: async (userId, courseId, lessonId) => {
    // Assuming lessonId is a unique identifier (string or number) within the course
    const { progress, courses } = getCollections();
    const userObjectId = new ObjectId(userId);
    const courseObjectId = new ObjectId(courseId);

    // Find the course to get total lesson count
    const course = await courses.findOne({ _id: courseObjectId });
    if (!course) {
      throw new Error("Course not found");
    }
    // Calculate total lessons (assuming modules structure)
    const totalLessons = course.modules.reduce((total, module) => total + (module.lessons?.length || 0), 0);
    if (totalLessons === 0) {
        // Avoid division by zero if course has no lessons
         console.warn(`Course ${courseId} has no lessons.`);
         // Optionally update progress to 100 or handle as needed
    }


    // Find the progress document
    let progressDoc = await progress.findOne({ userId: userObjectId, courseId: courseObjectId });

    if (!progressDoc) {
      // Initialize progress if not found
      const initialProgress = {
        userId: userObjectId,
        courseId: courseObjectId,
        completedLessons: [lessonId],
        progress: totalLessons > 0 ? Math.round((1 / totalLessons) * 100) : 0,
      };
      const result = await progress.insertOne(initialProgress);
      return await progress.findOne({_id: result.insertedId}); // Return the newly created doc
    } else {
      // Add lesson to completedLessons if not already present ($addToSet)
      const updateResult = await progress.updateOne(
        { _id: progressDoc._id, completedLessons: { $ne: lessonId } }, // Condition to only update if lessonId not present
        { $push: { completedLessons: lessonId } }
      );

      // If the lesson was added, recalculate progress
      if (updateResult.modifiedCount > 0) {
        const updatedCompletedLessons = [...progressDoc.completedLessons, lessonId];
        const newProgress = totalLessons > 0 ? Math.round((updatedCompletedLessons.length / totalLessons) * 100) : 0;

        await progress.updateOne(
          { _id: progressDoc._id },
          { $set: { progress: newProgress } }
        );
        // Fetch and return the updated document
         return await progress.findOne({ _id: progressDoc._id });
      } else {
         // Lesson was already completed or document not found (shouldn't happen due to findOne above)
         return progressDoc; // Return existing document
      }
    }
  },

  // Get user's overall progress
  getUserOverallProgress: async (userId) => {
    const { progress } = getCollections();
    const userObjectId = new ObjectId(userId);

    const userProgressRecords = await progress.find({ userId: userObjectId }).toArray();

    if (userProgressRecords.length === 0) {
      return { completedCourses: 0, inProgressCourses: 0, averageProgress: 0 };
    }

    const completedCourses = userProgressRecords.filter((p) => p.progress === 100).length;
    const inProgressCourses = userProgressRecords.filter((p) => p.progress > 0 && p.progress < 100).length;
    const totalProgressSum = userProgressRecords.reduce((sum, p) => sum + p.progress, 0);
    const averageProgress = totalProgressSum / userProgressRecords.length;

    return {
      completedCourses,
      inProgressCourses,
      averageProgress: Math.round(averageProgress),
    };
  },

  // Get course completion rate
  getCourseCompletionRate: async (courseId) => {
    const { progress } = getCollections();
    const courseObjectId = new ObjectId(courseId);

    const courseProgressRecords = await progress.find({ courseId: courseObjectId }).toArray();

    if (courseProgressRecords.length === 0) {
      return 0;
    }

    const completedCount = courseProgressRecords.filter((p) => p.progress === 100).length;
    return Math.round((completedCount / courseProgressRecords.length) * 100);
  },
};

module.exports = ProgressModel;

