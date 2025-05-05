const CourseModel = require("../models/course.model");
const User = require("../models/User");
const ProgressModel = require("../models/progress.model");
const CommentModel = require("../models/comment.model");

// Course controller
const CourseController = {
  // Get all courses
  getAllCourses: async (req, res) => {
    const { search, category, language, sort } = req.query;

    try {
      let courses;

      // Handle search query
      if (search) {
        courses = await CourseModel.searchCourses(search);
      } else if (category && category !== "all") {
        courses = await CourseModel.getCoursesByCategory(category);
      } else if (language && language !== "all") {
        courses = await CourseModel.getCoursesByLanguage(language);
      } else {
        courses = await CourseModel.getAllCourses();
      }

      // Apply additional filters if both category and language are provided
      if (category && category !== "all" && language && language !== "all") {
        courses = courses.filter(
          (course) =>
            course.category === category && course.language === language
        );
      } else if (category && category !== "all") {
        courses = courses.filter((course) => course.category === category);
      } else if (language && language !== "all") {
        courses = courses.filter((course) => course.language === language);
      }

      // Apply sorting
      if (sort) {
        switch (sort) {
          case "price-low":
            courses = courses.sort((a, b) => a.price - b.price);
            break;
          case "price-high":
            courses = courses.sort((a, b) => b.price - a.price);
            break;
          case "rating":
            courses = courses.sort((a, b) => b.rating - a.rating);
            break;
          case "newest":
            courses = courses.sort(
              (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            );
            break;
        }
      } else {
        // Default sort by newest
        courses = courses.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
      }

      const categories = await CourseModel.getAllCategories();
      const languages = await CourseModel.getAllLanguages();

      res.render("courses/index", {
        courses,
        categories,
        languages,
        search: search || "",
        category: category || "all",
        language: language || "all",
        sort: sort || "newest",
      });
    } catch (error) {
      console.error("Get All Courses error:", error);
      req.flash("error_msg", "Could not load courses.");
      res.redirect("/");
    }
  },

  // Get course details
  getCourseDetails: async (req, res) => {
    const courseId = req.params.id;

    try {
      const course = await CourseModel.getCourseById(courseId);

      if (!course) {
        req.flash("error_msg", "Course not found");
        return res.redirect("/courses");
      }

      // Get instructor info if needed
      let instructorName = course.instructor || "Unknown Instructor";

      // Check if user is enrolled
      let isEnrolled = false;
      let progress = 0;
      let user = null;

      if (req.session.user) {
        user = await User.findById(req.session.user.id);
        // Check if user exists and has enrolledCourses array
        // Ensure comparison works between string courseId and ObjectId array
        if (
          user &&
          user.enrolledCourses &&
          user.enrolledCourses.some(
            (enrolledCourseId) => enrolledCourseId.toString() === courseId
          )
        ) {
          isEnrolled = true;
          // Find progress record
          const userProgress = await ProgressModel.getProgress(
            user._id,
            courseId
          );
          progress = userProgress ? userProgress.progress : 0;
        }
      }

      res.render("courses/details", {
        course,
        instructorName,
        isEnrolled,
        progress,
        user,
      });
    } catch (error) {
      console.error("Get Course Details error:", error);
      req.flash("error_msg", "Could not load course details.");
      res.redirect("/courses");
    }
  },

  // Course learning page
  getCourseLearningPage: async (req, res) => {
    if (!req.session.user) {
      req.flash("error_msg", "Please login to access course content");
      return res.redirect("/login");
    }

    const courseId = req.params.id;
    const userId = req.session.user.id;

    try {
      const course = await CourseModel.getCourseById(courseId);
      const user = await User.findById(userId);

      if (!course || !user) {
        req.flash("error_msg", "Course or user not found");
        return res.redirect("/courses");
      }

      // Check if enrolled
      if (!user.enrolledCourses.includes(courseId)) {
        req.flash("error_msg", "You are not enrolled in this course");
        return res.redirect(`/courses/${courseId}`);
      }

      // Get progress
      const userProgress = await ProgressModel.getProgress(userId, courseId);

      // Determine current lesson
      let currentLesson = null;
      let currentModule = null;
      const lessonId = req.query.lesson;

      if (lessonId && course.modules) {
        for (const module of course.modules) {
          // Ensure lessons array exists and find the lesson by _id
          const lesson = module.lessons?.find(
            (l) => l._id.toString() === lessonId
          ); // Changed l.id to l._id.toString()
          if (lesson) {
            currentLesson = lesson;
            currentModule = module;
            break;
          }
        }
      }

      // Default to first lesson if not found or no lessonId provided
      if (
        !currentLesson &&
        course.modules &&
        course.modules.length > 0 &&
        course.modules[0].lessons &&
        course.modules[0].lessons.length > 0
      ) {
        currentModule = course.modules[0];
        currentLesson = currentModule.lessons[0];
      } else if (!currentLesson) {
        // Handle case where course has no modules or lessons
        req.flash("error_msg", "Course content not available yet.");
        return res.redirect(`/courses/${courseId}`);
      }

      const completedLessons = userProgress.completedLessons || [];

      res.render("courses/learn", {
        course,
        currentModule,
        currentLesson,
        progress: userProgress.progress,
        completedLessons: completedLessons, // Pass the array directly
      });
    } catch (error) {
      console.error("Course Learning Page error:", error);
      req.flash("error_msg", "Could not load course content.");
      res.redirect(`/courses/${courseId}`);
    }
  },

  // Mark lesson as complete
  markLessonAsComplete: async (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { courseId, lessonId } = req.params;
    const userId = req.session.user.id;

    try {
      // First verify the course exists
      const course = await CourseModel.getCourseById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      // Verify the lesson exists
      let lessonExists = false;
      for (const module of course.modules || []) {
        if (Array.isArray(module.lessons)) {
          if (
            module.lessons.some(
              (lesson) =>
                lesson && lesson._id && lesson._id.toString() === lessonId // Changed lesson.id to lesson._id
            )
          ) {
            lessonExists = true;
            break;
          }
        }
      }

      if (!lessonExists) {
        return res.status(404).json({
          success: false,
          message: "Lesson not found in this course",
        });
      }

      // Calculate total lessons from the fetched course
      const totalLessons = course.modules.reduce(
        (total, module) => total + (module.lessons?.length || 0),
        0
      );

      // Now proceed with marking the lesson as complete, passing totalLessons
      const updatedProgress = await ProgressModel.markLessonAsComplete(
        userId,
        course._id, // Changed course.id to course._id
        lessonId,
        totalLessons
      );

      if (!updatedProgress) {
        return res.status(500).json({
          success: false,
          message: "Could not update progress",
        });
      }

      res.json({
        success: true,
        progress: updatedProgress.progress,
        completedLessonId: lessonId,
      });
    } catch (error) {
      console.error("Mark Lesson Complete error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error marking lesson complete",
      });
    }
  },

  // Add comment
  addComment: async (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { courseId, lessonId } = req.params;
    const userId = req.session.user.id;
    const { comment } = req.body;

    try {
      // Validate request
      if (!comment || !comment.trim()) {
        return res.status(400).json({
          success: false,
          message: "Comment text is required",
        });
      }

      // Validate that the course and lesson exist
      const course = await CourseModel.getCourseById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      // Verify the user is enrolled in the course
      const user = await User.findById(userId);
      if (
        !user ||
        !user.enrolledCourses.some((id) => id.toString() === courseId)
      ) {
        return res.status(403).json({
          success: false,
          message: "You must be enrolled in this course to comment",
        });
      }

      // Create the comment
      const newComment = await CommentModel.createComment({
        courseId,
        lessonId,
        userId,
        comment,
      });

      // Format date for display
      const timestamp = "Just now";

      // Return success response
      res.json({
        success: true,
        comment: newComment.comment,
        username: newComment.username,
        timestamp,
      });
    } catch (error) {
      console.error("Add Comment error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error posting comment",
      });
    }
  },

  // Get comments for a lesson
  getComments: async (req, res) => {
    const { courseId, lessonId } = req.params;

    try {
      const comments = await CommentModel.getCommentsByLesson(
        courseId,
        lessonId
      );

      // Format the comments for display
      const formattedComments = comments.map((comment) => ({
        id: comment._id,
        username: comment.username,
        comment: comment.comment,
        timestamp: formatTimestamp(comment.createdAt),
      }));

      res.json({
        success: true,
        comments: formattedComments,
      });
    } catch (error) {
      console.error("Get Comments error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Error fetching comments",
      });
    }
  },
};

// Helper function to format timestamps
function formatTimestamp(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000); // Difference in seconds

  if (diff < 60) return "Just now";
  if (diff < 3600) return Math.floor(diff / 60) + " minutes ago";
  if (diff < 86400) return Math.floor(diff / 3600) + " hours ago";
  if (diff < 2592000) return Math.floor(diff / 86400) + " days ago";

  // Format date for older comments
  return date.toLocaleDateString();
}

module.exports = CourseController;
