const User = require("../models/User"); 
const ProgressModel = require("../models/progress.model");
const CourseModel = require("../models/course.model");
const bcrypt = require("bcryptjs");

const AuthController = {
  getLoginPage: (req, res) => {
    if (req.session.user) {
      return res.redirect("/dashboard");
    }
    res.render("auth/login");
  },

  login: async (req, res) => {
    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email });
      if (!user) {
        req.flash("error_msg", "Invalid email or password");
        return res.redirect("/login");
      }

      // Compare password
      const isMatch = await bcrypt.compare(password, user.password);compare

      if (!isMatch) {
        req.flash("error_msg", "Invalid email or password");
        return res.redirect("/login");
      }

      req.session.user = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      };

      if (user.role === "admin") {
        return res.redirect("/admin/dashboard");
      } else if (user.role === "instructor") {
        return res.redirect("/instructor/dashboard");
      } else {
        return res.redirect("/dashboard");
      }
    } catch (error) {
      console.error("Login error:", error);
      req.flash("error_msg", "An error occurred during login.");
      res.redirect("/login");
    }
  },

  getRegisterPage: (req, res) => {
    if (req.session.user) {
      return res.redirect("/dashboard");
    }
    res.render("auth/register");
  },

  register: async (req, res) => {
    const { name, email, password, confirmPassword, role } = req.body;

    const errors = [];
    if (!name || !email || !password || !confirmPassword) {
      errors.push("All fields are required");
    }
    if (password !== confirmPassword) {
      errors.push("Passwords do not match");
    }
    if (password.length < 6) {
      errors.push("Password must be at least 6 characters");
    }

    if (errors.length > 0) {
      return res.render("auth/register", {
        errors,
        name,
        email,
        role,
      });
    }

    try {
      let user = await User.findOne({ email });
      if (user) {
        errors.push("Email already registered");
        return res.render("auth/register", { errors, name, email, role });
      }

      const newUser = new User({
        name,
        email,
        password,
        role: role || "student",
        joinDate: new Date()
      });

      user = await newUser.save();

      req.session.user = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      };

      if (user.role === "admin") {
        return res.redirect("/admin/dashboard");
      } else if (user.role === "instructor") {
        return res.redirect("/instructor/dashboard");
      } else {
        return res.redirect("/dashboard");
      }
    } catch (error) {
      console.error("Registration error:", error);
      req.flash("error_msg", "An error occurred during registration.");
      res.render("auth/register", {
        name,
        email,
        role,
      });
    }
  },

  logout: (req, res) => {
    req.session.destroy();
    res.redirect("/");
  },

  getDashboard: async (req, res) => {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    try {
        const user = await User.findById(req.session.user.id);

        if (!user) {
          req.session.destroy();
          req.flash("error_msg", "User not found. Please log in again.");
          return res.redirect("/login");
        }

        if (user.role === "admin") {
          return res.redirect("/admin/dashboard");
        } else if (user.role === "instructor") {
          return res.redirect("/instructor/dashboard");
        } else {
          const enrolledCourseIds = user.enrolledCourses || [];
          
          const progressStats = await ProgressModel.getUserOverallProgress(user._id);
          
          const enrolledCoursesWithProgress = [];
          
          for (const courseId of enrolledCourseIds) {
            const course = await CourseModel.getCourseById(courseId);
            if (course) {
              const progressData = await ProgressModel.getProgress(user._id, courseId);
              enrolledCoursesWithProgress.push({
                ...course,
                progress: progressData ? progressData.progress : 0
              });
            }
          }

          return res.render("dashboard/student", {
            enrolledCourses: enrolledCoursesWithProgress,
            progress: progressStats,
          });
        }
    } catch (error) {
        console.error("Dashboard error:", error);
        req.flash("error_msg", "Could not load dashboard.");
        res.redirect('/login');
    }
  },
};

module.exports = AuthController;
