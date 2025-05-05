const { ObjectId } = require("mongodb");
const { getDb } = require("../config/database"); // Assuming getDb returns the MongoDB database instance

// Helper to ensure an ObjectId instance, or return input if not valid
const toObjectId = id => {
  if (id instanceof ObjectId) return id;
  if (typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id)) return new ObjectId(id);
  return id; // Return as-is if not a valid ObjectId string
};

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
    const userObjectId = toObjectId(userId);
    const courseObjectId = toObjectId(courseId);

    return (
      (await progress.findOne({ userId: userObjectId, courseId: courseObjectId })) || {
        userId: userObjectId,
        courseId: courseObjectId,
        progress: 0,
        completedLessons: [],
      }
    );
  },

  // Initialize progress record on enrollment
  initializeProgress: async (userId, courseId) => {
    const { progress } = getCollections();
    const userObjectId = toObjectId(userId);
    const courseObjectId = toObjectId(courseId);

    // Check if progress already exists
    const existingProgress = await progress.findOne({ userId: userObjectId, courseId: courseObjectId });

    if (!existingProgress) {
      // Create initial progress record if it doesn't exist
      const initialProgress = {
        userId: userObjectId,
        courseId: courseObjectId,
        progress: 0,
        completedLessons: [],
      };
      const result = await progress.insertOne(initialProgress);
      return await progress.findOne({_id: result.insertedId}); // Return the newly created doc
    } else {
      // Return existing progress if found
      return existingProgress;
    }
  },

  // Mark lesson as complete
  markLessonAsComplete: async (userId, courseId, lessonId, totalLessons) => {
    // Assuming lessonId is a unique identifier (string or number) within the course
    const { progress } = getCollections();
    const userObjectId = toObjectId(userId);
    const courseObjectId = toObjectId(courseId);

    // totalLessons is now passed as an argument, no need to fetch course here
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
      // Check if the lesson is already in the completedLessons array
      const lessonAlreadyCompleted = progressDoc.completedLessons && 
                                    progressDoc.completedLessons.includes(lessonId);
      
      if (!lessonAlreadyCompleted) {
        // Add lesson to completedLessons if not already present
        const updatedCompletedLessons = [...(progressDoc.completedLessons || []), lessonId];
        const newProgress = totalLessons > 0 ? 
                           Math.round((updatedCompletedLessons.length / totalLessons) * 100) : 0;

        await progress.updateOne(
          { _id: progressDoc._id },
          { 
            $set: { progress: newProgress },
            $push: { completedLessons: lessonId }
          }
        );
        
        // Fetch and return the updated document
        return await progress.findOne({ _id: progressDoc._id });
      } else {
        // Lesson was already completed
        return progressDoc; // Return existing document
      }
    }
  },

  // Get user's overall progress
  getUserOverallProgress: async (userId) => {
    const { progress } = getCollections();
    const userObjectId = toObjectId(userId);

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
    const courseObjectId = toObjectId(courseId);

    const courseProgressRecords = await progress.find({ courseId: courseObjectId }).toArray();

    if (courseProgressRecords.length === 0) {
      return 0;
    }

    const completedCount = courseProgressRecords.filter((p) => p.progress === 100).length;
    return Math.round((completedCount / courseProgressRecords.length) * 100);
  },
};

module.exports = ProgressModel;

