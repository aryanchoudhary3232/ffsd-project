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
    const isAjax = req.xhr || req.headers.accept?.indexOf("json") > -1;

    try {
      const user = await User.findOne({ email });
      if (!user) {
        if (isAjax) {
          return res
            .status(401)
            .json({ success: false, message: "Invalid email or password" });
        }
        req.flash("error_msg", "Invalid email or password");
        return res.redirect("/login");
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        if (isAjax) {
          return res
            .status(401)
            .json({ success: false, message: "Invalid email or password" });
        }
        req.flash("error_msg", "Invalid email or password");
        return res.redirect("/login");
      }

      req.session.user = {
        id: user._id,
        name: user.username,
        email: user.email,
        role: user.role,
      };

      let redirectUrl = "/dashboard";
      if (user.role === "admin") {
        redirectUrl = "/admin/dashboard";
      } else if (user.role === "instructor") {
        redirectUrl = "/instructor/dashboard";
      }

      if (isAjax) {
        return res.json({
          success: true,
          message: "Login successful",
          redirectUrl,
        });
      }

      return res.redirect(redirectUrl);
    } catch (error) {
      console.error("Login error:", error);
      if (isAjax) {
        return res
          .status(500)
          .json({ success: false, message: "An error occurred during login." });
      }
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
    const isAjax = req.xhr || req.headers.accept?.indexOf("json") > -1;

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
      if (isAjax) {
        return res.status(400).json({ success: false, errors });
      }
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
        if (isAjax) {
          return res.status(400).json({ success: false, errors });
        }
        return res.render("auth/register", { errors, name, email, role });
      }

      const newUser = new User({
        name,
        email,
        password,
        role: role || "student",
        joinDate: new Date(),
      });

      user = await newUser.save();

      req.session.user = {
        id: user._id,
        name: user.username,
        email: user.email,
        role: user.role,
      };

      let redirectUrl = "/dashboard";
      if (user.role === "admin") {
        redirectUrl = "/admin/dashboard";
      } else if (user.role === "instructor") {
        redirectUrl = "/instructor/dashboard";
      }

      if (isAjax) {
        return res.json({
          success: true,
          message: "Registration successful",
          redirectUrl,
        });
      }

      return res.redirect(redirectUrl);
    } catch (error) {
      console.error("Registration error:", error);
      if (isAjax) {
        return res
          .status(500)
          .json({
            success: false,
            errors: ["An error occurred during registration."],
          });
      }
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

        const progressStats = await ProgressModel.getUserOverallProgress(
          user._id
        );

        const enrolledCoursesWithProgress = [];

        for (const courseId of enrolledCourseIds) {
          const course = await CourseModel.getCourseById(courseId);
          if (course) {
            const progressData = await ProgressModel.getProgress(
              user._id,
              courseId
            );
            enrolledCoursesWithProgress.push({
              ...course,
              progress: progressData ? progressData.progress : 0,
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
      res.redirect("/login");
    }
  },
};

module.exports = AuthController;
