const CourseModel = require("../models/course.model");
const User = require("../models/User");
const ProgressModel = require("../models/progress.model");

// Course controller
const CourseController = {
  // Get all courses
  getAllCourses: async (req, res) => {
    const { search, category, sort } = req.query;

    try {
        let courses;
        
        // Handle search query
        if (search) {
            courses = await CourseModel.searchCourses(search);
        } else if (category && category !== "all") {
            courses = await CourseModel.getCoursesByCategory(category);
        } else {
            courses = await CourseModel.getAllCourses();
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
                    courses = courses.sort((a, b) => 
                        new Date(b.createdAt) - new Date(a.createdAt)
                    );
                    break;
            }
        } else {
            // Default sort by newest
            courses = courses.sort((a, b) => 
                new Date(b.createdAt) - new Date(a.createdAt)
            );
        }

        const categories = await CourseModel.getAllCategories();

        res.render("courses/index", {
            courses,
            categories,
            search: search || "",
            category: category || "all",
            sort: sort || "newest",
        });
    } catch (error) {
        console.error("Get All Courses error:", error);
        req.flash("error_msg", "Could not load courses.");
        res.redirect('/');
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
        let instructorName = course.instructor || 'Unknown Instructor';

        // Check if user is enrolled
        let isEnrolled = false;
        let progress = 0;

        if (req.session.user) {
            const user = await User.findById(req.session.user.id);
            // Check if user exists and has enrolledCourses array
            if (user && user.enrolledCourses && user.enrolledCourses.includes(courseId)) {
                isEnrolled = true;
                // Find progress record
                const userProgress = await ProgressModel.getProgress(user._id, courseId);
                progress = userProgress ? userProgress.progress : 0;
            }
        }

        res.render("courses/details", {
            course,
            instructorName,
            isEnrolled,
            progress,
        });
    } catch (error) {
        console.error("Get Course Details error:", error);
        req.flash("error_msg", "Could not load course details.");
        res.redirect('/courses');
    }
  },

  // Enroll in course
  enrollInCourse: async (req, res) => {
    if (!req.session.user) {
        req.flash("error_msg", "Please login to enroll in courses");
        return res.redirect("/login");
    }

    const courseId = req.params.id;
    const userId = req.session.user.id;

    try {
        // Check if course exists
        const course = await CourseModel.getCourseById(courseId);
        if (!course) {
            req.flash("error_msg", "Course not found");
            return res.redirect(`/courses`);
        }

        // Add course to user's enrolledCourses array if not already present
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $addToSet: { enrolledCourses: courseId } },
            { new: true }
        );

        if (!updatedUser) {
            req.flash("error_msg", "User not found");
            return res.redirect("/login");
        }

        // Initialize progress for this course
        await ProgressModel.getProgress(userId, courseId);

        req.flash("success_msg", "Successfully enrolled in the course");
        res.redirect(`/courses/${courseId}/learn`);
    } catch (error) {
        console.error("Enrollment error:", error);
        req.flash("error_msg", error.message || "Error enrolling in course");
        res.redirect(`/courses/${courseId}`);
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
                // Ensure lessons array exists and find the lesson
                const lesson = module.lessons?.find(l => l._id.toString() === lessonId);
                if (lesson) {
                    currentLesson = lesson;
                    currentModule = module;
                    break;
                }
            }
        }

        // Default to first lesson if not found or no lessonId provided
        if (!currentLesson && course.modules && course.modules.length > 0 && 
            course.modules[0].lessons && course.modules[0].lessons.length > 0) {
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
            completedLessons: completedLessons.map(id => id.toString()),
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
        // Use the ProgressModel's markLessonAsComplete method
        const updatedProgress = await ProgressModel.markLessonAsComplete(userId, courseId, lessonId);
        
        if (!updatedProgress) {
            return res.status(500).json({ 
                success: false, 
                message: "Could not update progress" 
            });
        }

        res.json({
            success: true,
            progress: updatedProgress.progress,
            completedLessonId: lessonId
        });
    } catch (error) {
        console.error("Mark Lesson Complete error:", error);
        res.status(500).json({ 
            success: false, 
            message: error.message || "Error marking lesson complete" 
        });
    }
  },
};

module.exports = CourseController;

