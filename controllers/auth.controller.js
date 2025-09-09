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

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        req.flash("error_msg", "Invalid email or password");
        return res.redirect("/login");
      }

      // Standardize: store both username and name (alias) for compatibility
      req.session.user = {
        id: user._id,
        username: user.username,
        name: user.username,
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
    // Accept either 'username' or legacy 'name' from form submissions
    const { username, name, email, password, confirmPassword, role } = req.body;
    const finalUsername = username || name; // unify

    const errors = [];
    if (!finalUsername || !email || !password || !confirmPassword) {
      errors.push("All fields are required");
    }
    if (password !== confirmPassword) {
      errors.push("Passwords do not match");
    }
    if (password && password.length < 6) {
      errors.push("Password must be at least 6 characters");
    }

    if (errors.length > 0) {
      return res.render("auth/register", {
        errors,
        username: finalUsername,
        email,
        role,
      });
    }

    try {
      let user = await User.findOne({ email });
      if (user) {
        errors.push("Email already registered");
        return res.render("auth/register", {
          errors,
          username: finalUsername,
          email,
          role,
        });
      }

      const newUser = new User({
        username: finalUsername,
        email,
        password,
        role: role || "student",
        joinDate: new Date(),
      });

      user = await newUser.save();

      req.session.user = {
        id: user._id,
        username: user.username,
        name: user.username,
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
        username: finalUsername,
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

  // API Methods for AJAX requests
  apiLogin: async (req, res) => {
    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      req.session.user = {
        id: user._id,
        username: user.username,
        name: user.username,
        email: user.email,
        role: user.role,
      };

      res.json({
        success: true,
        message: "Login successful",
        user: {
          id: user._id,
          username: user.username,
          name: user.username,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("API Login error:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred during login",
      });
    }
  },

  apiRegister: async (req, res) => {
    const { username, name, email, password, confirmPassword, role } = req.body;
    const finalUsername = username || name;

    try {
      // Validation
      if (!finalUsername || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Please fill in all required fields",
        });
      }

      if (confirmPassword !== undefined && password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "Passwords do not match",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User with this email already exists",
        });
      }

      // Create new user
      const newUser = new User({
        username: finalUsername,
        email,
        password,
        role: role || "student",
      });

      await newUser.save();

      // Auto-login newly registered user
      req.session.user = {
        id: newUser._id,
        username: newUser.username,
        name: newUser.username,
        email: newUser.email,
        role: newUser.role,
      };

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        user: {
          id: newUser._id,
          username: newUser.username,
          name: newUser.username,
          email: newUser.email,
          role: newUser.role,
        },
      });
    } catch (error) {
      console.error("API Register error:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred during registration",
      });
    }
  },

  apiLogout: (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Could not log out",
        });
      }
      res.json({
        success: true,
        message: "Logged out successfully",
      });
    });
  },

  apiCheckStatus: (req, res) => {
    if (req.session.user) {
      // Ensure both name and username are present for frontend compatibility
      const u = req.session.user;
      if (!u.username && u.name) u.username = u.name;
      if (!u.name && u.username) u.name = u.username;
      res.json({ success: true, user: u });
    } else {
      res.json({ success: false, user: null });
    }
  },
};

module.exports = AuthController;
