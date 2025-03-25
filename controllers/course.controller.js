const CourseModel = require("../models/course.model")
const UserModel = require("../models/user.model")
const ProgressModel = require("../models/progress.model")

// Course controller
const CourseController = {
  // Get all courses
  getAllCourses: (req, res) => {
    const { search, category, sort } = req.query
    let courses = CourseModel.getAllCourses()
    const categories = CourseModel.getAllCategories()

    // Apply search filter
    if (search) {
      courses = CourseModel.searchCourses(search)
    }

    // Apply category filter
    if (category && category !== "all") {
      courses = courses.filter((course) => course.category === category)
    }

    // Apply sorting
    if (sort) {
      switch (sort) {
        case "price-low":
          courses.sort((a, b) => a.price - b.price)
          break
        case "price-high":
          courses.sort((a, b) => b.price - a.price)
          break
        case "rating":
          courses.sort((a, b) => b.rating - a.rating)
          break
        case "newest":
          courses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          break
      }
    } else {
      // Default sort by newest
      courses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }

    res.render("courses/index", {
      courses,
      categories,
      search: search || "",
      category: category || "all",
      sort: sort || "newest",
    })
  },

  // Get course details
  getCourseDetails: (req, res) => {
    const courseId = req.params.id
    const course = CourseModel.getCourseById(courseId)

    if (!course) {
      req.flash("error_msg", "Course not found")
      return res.redirect("/courses")
    }

    // Check if user is enrolled
    let isEnrolled = false
    let progress = 0

    if (req.session.user) {
      const user = UserModel.getUserById(req.session.user.id)
      isEnrolled = user.enrolledCourses.includes(courseId)

      if (isEnrolled) {
        const userProgress = ProgressModel.getProgress(user.id, courseId)
        progress = userProgress.progress
      }
    }

    res.render("courses/details", {
      course,
      isEnrolled,
      progress,
    })
  },

  // Enroll in course
  enrollInCourse: (req, res) => {
    if (!req.session.user) {
      req.flash("error_msg", "Please login to enroll in courses")
      return res.redirect("/login")
    }

    const courseId = req.params.id
    const userId = req.session.user.id

    try {
      const enrolled = UserModel.enrollUserInCourse(userId, courseId)

      if (enrolled) {
        req.flash("info_msg", "You are already enrolled in this course")
      } else {
        req.flash("success_msg", "Successfully enrolled in the course")
      }

      res.redirect(`/courses/${courseId}/learn`)
    } catch (error) {
      req.flash("error_msg", error.message)
      res.redirect(`/courses/${courseId}`)
    }
  },

  // Course learning page
  getCourseLearningPage: (req, res) => {
    if (!req.session.user) {
      req.flash("error_msg", "Please login to access course content")
      return res.redirect("/login")
    }

    const courseId = req.params.id
    const userId = req.session.user.id
    const course = CourseModel.getCourseById(courseId)
    const user = UserModel.getUserById(userId)

    if (!course || !user) {
      req.flash("error_msg", "Course or user not found")
      return res.redirect("/courses")
    }

    // Check if enrolled
    if (!user.enrolledCourses.includes(courseId)) {
      req.flash("error_msg", "You are not enrolled in this course")
      return res.redirect(`/courses/${courseId}`)
    }

    // Get progress
    const userProgress = ProgressModel.getProgress(userId, courseId)

    // Get current lesson (from query or first lesson)
    const lessonId = req.query.lesson || course.modules[0].lessons[0].id

    // Find current lesson
    let currentLesson = null
    let currentModule = null

    for (const module of course.modules) {
      const lesson = module.lessons.find((l) => l.id === lessonId)
      if (lesson) {
        currentLesson = lesson
        currentModule = module
        break
      }
    }

    if (!currentLesson) {
      currentModule = course.modules[0]
      currentLesson = currentModule.lessons[0]
    }

    res.render("courses/learn", {
      course,
      currentModule,
      currentLesson,
      progress: userProgress.progress,
      completedLessons: userProgress.completedLessons,
    })
  },

  // Mark lesson as complete
  markLessonAsComplete: (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" })
    }

    const { courseId, lessonId } = req.params
    const userId = req.session.user.id

    try {
      const updatedProgress = ProgressModel.markLessonAsComplete(userId, courseId, lessonId)

      res.json({
        success: true,
        progress: updatedProgress.progress,
      })
    } catch (error) {
      res.status(400).json({ success: false, message: error.message })
    }
  },

  // Search courses
  searchCourses: (req, res) => {
    const { query } = req.query

    if (!query) {
      return res.redirect("/courses")
    }

    const courses = CourseModel.searchCourses(query)
    const categories = CourseModel.getAllCategories()

    res.render("courses/index", {
      courses,
      categories,
      search: query,
      category: "all",
      sort: "newest",
    })
  },
}

module.exports = CourseController

