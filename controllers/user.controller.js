const UserModel = require("../models/user.model")
const CourseModel = require("../models/course.model")
const ProgressModel = require("../models/progress.model")
const bcrypt = require("bcrypt")

// User controller
const UserController = {
  // Get student dashboard
  getStudentDashboard: (req, res) => {
    if (!req.session.user) {
      return res.redirect("/login")
    }

    const userId = req.session.user.id
    const enrolledCourses = UserModel.getUserEnrolledCourses(userId)
    const progress = ProgressModel.getUserOverallProgress(userId)

    // Get recommended courses (not enrolled)
    const allCourses = CourseModel.getAllCourses()
    const enrolledIds = enrolledCourses.map((course) => course.id)
    const recommendedCourses = allCourses.filter((course) => !enrolledIds.includes(course.id)).slice(0, 3)

    res.render("dashboard/student", {
      enrolledCourses,
      progress,
      recommendedCourses,
    })
  },

  // Get user profile
  getUserProfile: (req, res) => {
    if (!req.session.user) {
      return res.redirect("/login")
    }

    const userId = req.session.user.id
    const user = UserModel.getUserById(userId)

    if (!user) {
      req.flash("error_msg", "User not found")
      return res.redirect("/")
    }

    res.render("user/profile", { user })
  },

  // Update user profile
  updateUserProfile: (req, res) => {
    if (!req.session.user) {
      return res.redirect("/login")
    }

    const userId = req.session.user.id
    const { name, email } = req.body

    try {
      const updatedUser = UserModel.updateUser(userId, { name, email })

      // Update session
      req.session.user = updatedUser

      req.flash("success_msg", "Profile updated successfully")
      res.redirect("/user/profile")
    } catch (error) {
      req.flash("error_msg", error.message)
      res.redirect("/user/profile")
    }
  },

  // Change password
  changePassword: (req, res) => {
    if (!req.session.user) {
      return res.redirect("/login")
    }

    const userId = req.session.user.id
    const { currentPassword, newPassword, confirmPassword } = req.body

    // Validation
    if (newPassword !== confirmPassword) {
      req.flash("error_msg", "New passwords do not match")
      return res.redirect("/user/profile")
    }

    try {
      // Verify current password
      const user = UserModel.getUserById(userId)
      const isValid = bcrypt.compareSync(currentPassword, user.password)

      if (!isValid) {
        req.flash("error_msg", "Current password is incorrect")
        return res.redirect("/user/profile")
      }

      // Update password
      const hashedPassword = bcrypt.hashSync(newPassword, 10)
      UserModel.updateUser(userId, { password: hashedPassword })

      req.flash("success_msg", "Password changed successfully")
      res.redirect("/user/profile")
    } catch (error) {
      req.flash("error_msg", error.message)
      res.redirect("/user/profile")
    }
  },

  // Get user's enrolled courses
  getUserCourses: (req, res) => {
    if (!req.session.user) {
      return res.redirect("/login")
    }

    const userId = req.session.user.id
    const enrolledCourses = UserModel.getUserEnrolledCourses(userId)

    res.render("user/courses", { enrolledCourses })
  },
}

module.exports = UserController

