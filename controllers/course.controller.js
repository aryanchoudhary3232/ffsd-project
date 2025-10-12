const CourseModel = require("../models/course.model");
const User = require("../models/User");
const ProgressModel = require("../models/progress.model");
const CommentModel = require("../models/comment.model");

// Course controller
const CourseController = {
  // Get all courses
  getAllCourses: async (req, res) => {
    const { search, category, language, sort, ajax } = req.query;

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
            course.category === category && course.courseLanguage === language
        );
      } else if (category && category !== "all") {
        courses = courses.filter((course) => course.category === category);
      } else if (language && language !== "all") {
        courses = courses.filter((course) => course.courseLanguage === language);
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

      if (ajax) {
        // render only the course cards
        return res.render("courses/course-cards", { courses, search }, (err, html) => {
          if (err) return res.status(500).send("Error rendering courses");
          res.send(html);
        });
      }

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
        user: user || null, // Pass fetched user or null
        success_msg: req.flash("success_msg") || "",
        error_msg: req.flash("error_msg") || "",
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

      console.log('Course found:', course.title);
      console.log('Course has modules:', course.modules ? 'Yes' : 'No');
      if (course.modules) {
        console.log('Number of modules:', course.modules.length);
        course.modules.forEach((module, idx) => {
          console.log(`Module ${idx + 1}:`, module.title, 'Lessons:', module.lessons ? module.lessons.length : 0);
        });
      }

      // Check if enrolled
      console.log('Checking enrollment for:', { 
        userId, 
        courseId, 
        enrolledCourses: user.enrolledCourses 
      });
      
      const normalizedCourseId = courseId.toString();
      const isEnrolled = user.enrolledCourses && user.enrolledCourses.some(
        (enrolledCourseId) => {
          const normalizedEnrolledId = enrolledCourseId.toString();
          return normalizedEnrolledId === normalizedCourseId;
        }
      );
      
      console.log('Enrollment check result:', isEnrolled);
      
      if (!isEnrolled) {
        req.flash("error_msg", "You are not enrolled in this course");
        return res.redirect(`/courses/${courseId}`);
      }

      // Get progress
      const userProgress = await ProgressModel.getProgress(userId, courseId);

      // Normalise modules/lessons structure to avoid undefined access in views
      const normalisedModules = Array.isArray(course.modules)
        ? course.modules
            .filter(Boolean)
            .map((module) => ({
              ...module,
              lessons: Array.isArray(module.lessons)
                ? module.lessons.filter(Boolean)
                : [],
            }))
        : [];

      const normaliseId = (value) => {
        if (!value) return "";
        if (typeof value === "string") return value;
        if (typeof value.toHexString === "function") return value.toHexString();
        if (typeof value.toString === "function") return value.toString();
        return String(value);
      };

      // Determine current lesson
      let currentLesson = null;
      let currentModule = null;
      const lessonId = req.query.lesson ? req.query.lesson.toString() : "";

      if (lessonId) {
        for (const module of normalisedModules) {
          const match = module.lessons.find((lesson) => {
            const lessonIdentifier = normaliseId(lesson._id || lesson.id);
            return lessonIdentifier && lessonIdentifier === lessonId;
          });

          if (match) {
            currentLesson = match;
            currentModule = module;
            break;
          }
        }
      }

      if (!currentLesson) {
        for (const module of normalisedModules) {
          if (module.lessons.length > 0) {
            currentModule = module;
            currentLesson = module.lessons[0];
            break;
          }
        }
      }

      if (!currentLesson) {
        req.flash("error_msg", "Course content not available yet.");
        return res.redirect(`/courses/${courseId}`);
      }

      const completedLessons = (userProgress.completedLessons || [])
        .map((lesson) => {
          if (!lesson) return "";
          if (typeof lesson === "string") return lesson;
          if (typeof lesson.toHexString === "function") return lesson.toHexString();
          if (typeof lesson.toString === "function") return lesson.toString();
          return String(lesson);
        })
        .filter(Boolean);
      const progressPercent =
        typeof userProgress.progress === "number" && !Number.isNaN(userProgress.progress)
          ? userProgress.progress
          : 0;

      const courseIdString =
        course._id && typeof course._id.toHexString === "function"
          ? course._id.toHexString()
          : courseId.toString();

      res.render("courses/learn", {
        course: { ...course, modules: normalisedModules },
        currentModule,
        currentLesson,
        progress: progressPercent,
        completedLessons,
        courseId: courseIdString,
        currentLessonId: normaliseId(currentLesson._id || currentLesson.id),
      });
    } catch (error) {
      console.error("Course Learning Page error:", error);
      req.flash("error_msg", "Could not load course content.");
      res.redirect(`/courses/${courseId}`);
    }
  },

  // Mark lesson as complete
  markLessonAsComplete: async (req, res) => {
    console.log('markLessonAsComplete called with:', req.params);
    
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { courseId, lessonId } = req.params;
    const userId = req.session.user.id;
    
    console.log('User ID:', userId);
    console.log('Course ID:', courseId);
    console.log('Lesson ID:', lessonId);

    try {
      // First verify the course exists
      const course = await CourseModel.getCourseById(courseId);
      if (!course) {
        console.log('Course not found:', courseId);
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      console.log('Course found:', course.title);
      
      // Verify the user is enrolled in this course
      const user = await User.findById(userId);
      if (!user) {
        console.log('User not found:', userId);
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      
      const isEnrolled = user.enrolledCourses && user.enrolledCourses.some(
        (enrolledCourseId) => enrolledCourseId.toString() === courseId.toString()
      );
      
      if (!isEnrolled) {
        console.log('User not enrolled in course');
        return res.status(403).json({
          success: false,
          message: "You are not enrolled in this course",
        });
      }

      // Verify the lesson exists
      let lessonExists = false;
      for (const module of course.modules || []) {
        if (Array.isArray(module.lessons)) {
          if (
            module.lessons.some(
              (lesson) => {
                if (!lesson) return false;
                // Check both _id and id fields to handle legacy data
                const lessonIdToCheck = lesson._id || lesson.id;
                return lessonIdToCheck && lessonIdToCheck.toString() === lessonId;
              }
            )
          ) {
            lessonExists = true;
            break;
          }
        }
      }

      if (!lessonExists) {
        console.log('Lesson not found in course:', lessonId);
        return res.status(404).json({
          success: false,
          message: "Lesson not found in this course",
        });
      }

      console.log('Lesson exists, proceeding to mark as complete');

      // Calculate total lessons from the fetched course
      const totalLessons = (course.modules || []).reduce((total, module) => {
        const lessons = Array.isArray(module.lessons) ? module.lessons : [];
        return total + lessons.length;
      }, 0);

      console.log('Total lessons in course:', totalLessons);

      // Now proceed with marking the lesson as complete, passing totalLessons
      const updatedProgress = await ProgressModel.markLessonAsComplete(
        userId,
        course._id,
        lessonId,
        totalLessons
      );

      if (!updatedProgress) {
        console.log('Failed to update progress');
        return res.status(500).json({
          success: false,
          message: "Could not update progress",
        });
      }

      console.log('Progress updated successfully:', updatedProgress);

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