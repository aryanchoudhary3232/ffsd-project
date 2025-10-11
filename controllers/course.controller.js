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

      // Check if enrolled
      if (!user.enrolledCourses || !user.enrolledCourses.some(
        (enrolledCourseId) => enrolledCourseId.toString() === courseId
      )) {
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
          // Ensure lessons array exists and find the lesson by _id or id
          const lesson = module.lessons?.find(
            (l) => {
              const lessonIdToCheck = l._id || l.id;
              return lessonIdToCheck && lessonIdToCheck.toString() === lessonId;
            }
          );
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
        completedLessons: completedLessons,
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
      const totalLessons = course.modules.reduce(
        (total, module) => total + (module.lessons?.length || 0),
        0
      );

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

  // API Methods for SPA
  apiGetAllCourses: async (req, res) => {
    try {
      const courses = await CourseModel.getAllCourses();
      res.json({
        success: true,
        courses: courses,
      });
    } catch (error) {
      console.error("API Get All Courses error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching courses",
      });
    }
  },

  apiGetFeaturedCourses: async (req, res) => {
    try {
      const courses = await CourseModel.getFeaturedCourses();
      res.json({
        success: true,
        courses: courses,
      });
    } catch (error) {
      console.error("API Get Featured Courses error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching featured courses",
      });
    }
  },

  apiSearchCourses: async (req, res) => {
    try {
      const { q } = req.query;
      const courses = q
        ? await CourseModel.searchCourses(q)
        : await CourseModel.getAllCourses();
      res.json({
        success: true,
        courses: courses,
      });
    } catch (error) {
      console.error("API Search Courses error:", error);
      res.status(500).json({
        success: false,
        message: "Error searching courses",
      });
    }
  },

  apiGetCourseById: async (req, res) => {
    try {
      const courseId = req.params.id;
      const course = await CourseModel.getCourseById(courseId);

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      res.json({
        success: true,
        course: course,
      });
    } catch (error) {
      console.error("API Get Course By ID error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching course",
      });
    }
  },

  apiCreateCourse: async (req, res) => {
    try {
      const {
        title,
        description,
        price,
        category,
        difficulty,
        duration,
        instructorId,
      } = req.body;

      // Validation
      if (
        !title ||
        !description ||
        !price ||
        !category ||
        !difficulty ||
        !duration ||
        !instructorId
      ) {
        return res.status(400).json({
          success: false,
          message: "All fields are required",
        });
      }

      // Create course data
      const courseData = {
        title,
        description,
        price: parseFloat(price),
        category,
        difficulty,
        duration: parseInt(duration),
        instructorId,
        createdAt: new Date(),
        status: "active",
      };

      const courseId = await CourseModel.createCourse(courseData);

      if (courseId) {
        res.status(201).json({
          success: true,
          message: "Course created successfully",
          courseId: courseId,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to create course",
        });
      }
    } catch (error) {
      console.error("API Create Course error:", error);
      res.status(500).json({
        success: false,
        message: "Error creating course",
      });
    }
  },

  apiUpdateCourse: async (req, res) => {
    try {
      const courseId = req.params.id;
      const {
        title,
        description,
        price,
        category,
        difficulty,
        duration,
        instructorId,
      } = req.body;

      // Validation
      if (
        !title ||
        !description ||
        !price ||
        !category ||
        !difficulty ||
        !duration ||
        !instructorId
      ) {
        return res.status(400).json({
          success: false,
          message: "All fields are required",
        });
      }

      // Check if course exists
      const existingCourse = await CourseModel.getCourseById(courseId);
      if (!existingCourse) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      // Update course
      const updateData = {
        title,
        description,
        price: parseFloat(price),
        category,
        difficulty,
        duration: parseInt(duration),
        instructorId,
      };

      const success = await CourseModel.updateCourse(courseId, updateData);

      if (success) {
        res.json({
          success: true,
          message: "Course updated successfully",
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to update course",
        });
      }
    } catch (error) {
      console.error("API Update Course error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating course",
      });
    }
  },

  apiDeleteCourse: async (req, res) => {
    try {
      const courseId = req.params.id;

      // Check if course exists
      const existingCourse = await CourseModel.getCourseById(courseId);
      if (!existingCourse) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      // Delete course
      const success = await CourseModel.deleteCourse(courseId);

      if (success) {
        res.json({
          success: true,
          message: "Course deleted successfully",
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to delete course",
        });
      }
    } catch (error) {
      console.error("API Delete Course error:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting course",
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
