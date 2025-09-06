const User = require("../models/User");
const CourseModel = require("../models/course.model");
const ProgressModel = require("../models/progress.model");

const StudentController = {
  getStats: async (req, res) => {
    try {
      const userId = req.session.user.id;

      // Get enrolled courses
      const user = await User.findById(userId);
      const enrolledCount = user.enrolledCourses
        ? user.enrolledCourses.length
        : 0;

      // Get completed courses
      const completedCount = user.completedCourses
        ? user.completedCourses.length
        : 0;

      // Get in-progress courses
      const inProgress = enrolledCount - completedCount;

      // Get certificates (for now, same as completed)
      const certificates = completedCount;

      res.json({
        success: true,
        stats: {
          enrolled: enrolledCount,
          completed: completedCount,
          inProgress: inProgress,
          certificates: certificates,
        },
      });
    } catch (error) {
      console.error("Get student stats error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching student statistics",
      });
    }
  },

  getEnrolledCourses: async (req, res) => {
    try {
      const userId = req.session.user.id;

      const user = await User.findById(userId);
      const enrolledCourseIds = user.enrolledCourses || [];

      const enrolledCourses = [];

      for (const courseId of enrolledCourseIds) {
        const course = await CourseModel.getCourseById(courseId);
        if (course) {
          // Get progress for this course
          const progressData = await ProgressModel.getProgress(
            userId,
            courseId
          );
          course.progress = progressData ? progressData.progress : 0;
          enrolledCourses.push(course);
        }
      }

      res.json({
        success: true,
        courses: enrolledCourses,
      });
    } catch (error) {
      console.error("Get enrolled courses error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching enrolled courses",
      });
    }
  },

  getProgress: async (req, res) => {
    try {
      const userId = req.session.user.id;

      const user = await User.findById(userId);
      const enrolledCourseIds = user.enrolledCourses || [];

      const progressData = [];

      for (const courseId of enrolledCourseIds) {
        const course = await CourseModel.getCourseById(courseId);
        const progress = await ProgressModel.getProgress(userId, courseId);

        if (course && progress) {
          progressData.push({
            courseTitle: course.title,
            progress: progress.progress,
            lastAccessed: progress.lastAccessed || new Date(),
          });
        }
      }

      res.json({
        success: true,
        progress: progressData,
      });
    } catch (error) {
      console.error("Get student progress error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching student progress",
      });
    }
  },
};

module.exports = StudentController;
