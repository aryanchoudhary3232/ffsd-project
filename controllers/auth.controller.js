const User = require("../models/User"); // Assuming Mongoose User model
const ProgressModel = require("../models/progress.model"); // Import as ProgressModel to match its implementation
const CourseModel = require("../models/course.model"); // Updated to use the MongoDB-based CourseModel
const bcrypt = require("bcryptjs"); // Make sure bcryptjs is used if installed, or bcrypt

// Auth controller
const AuthController = {
  // Render login page
  getLoginPage: (req, res) => {
    if (req.session.user) {
      return res.redirect("/dashboard");
    }
    res.render("auth/login");
  },

  // Handle login
  login: async (req, res) => { // Add async
    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email }); // Use Mongoose findOne

      if (!user) {
        req.flash("error_msg", "Invalid email or password");
        return res.redirect("/login");
      }

      // Compare password
      const isMatch = await bcrypt.compare(password, user.password); // Use bcrypt compare

      if (!isMatch) {
        req.flash("error_msg", "Invalid email or password");
        return res.redirect("/login");
      }

      // Set user session (store necessary fields, not the whole Mongoose object potentially)
      req.session.user = {
        id: user._id, // Use _id
        name: user.name,
        email: user.email,
        role: user.role,
      };

      // Redirect based on role
      if (user.role === "admin") {
        return res.redirect("/admin/dashboard");
      } else if (user.role === "instructor") {
        return res.redirect("/instructor/dashboard");
      } else {
        return res.redirect("/dashboard");
      }
    } catch (error) {
      console.error("Login error:", error); // Log the error
      req.flash("error_msg", "An error occurred during login."); // Generic error message
      res.redirect("/login");
    }
  },

  // Render register page
  getRegisterPage: (req, res) => {
    if (req.session.user) {
      return res.redirect("/dashboard");
    }
    res.render("auth/register");
  },

  // Handle registration
  register: async (req, res) => { // Add async
    const { name, email, password, confirmPassword, role } = req.body;

    // Validation
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
      // Check if user exists
      let user = await User.findOne({ email });
      if (user) {
        errors.push("Email already registered");
        return res.render("auth/register", { errors, name, email, role });
      }

      // Create new user object
      const newUser = new User({
        name,
        email,
        password, // Password will be hashed by pre-save hook in the model (assuming)
        role: role || "student",
        joinDate: new Date() // Add joinDate
      });

      // Hash password (if not handled by pre-save hook)
      // const salt = await bcrypt.genSalt(10);
      // newUser.password = await bcrypt.hash(password, salt);

      user = await newUser.save(); // Save user

      // Set user session
      req.session.user = {
        id: user._id, // Use _id
        name: user.name,
        email: user.email,
        role: user.role,
      };

      // Redirect based on role
      if (user.role === "admin") {
        return res.redirect("/admin/dashboard");
      } else if (user.role === "instructor") {
        return res.redirect("/instructor/dashboard");
      } else {
        return res.redirect("/dashboard");
      }
    } catch (error) {
      console.error("Registration error:", error); // Log the error
      req.flash("error_msg", "An error occurred during registration."); // Generic error message
      res.render("auth/register", {
        name,
        email,
        role,
      });
    }
  },

  // Handle logout
  logout: (req, res) => {
    req.session.destroy();
    res.redirect("/");
  },

  // Render dashboard based on role
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

        // Redirect based on role
        if (user.role === "admin") {
          return res.redirect("/admin/dashboard");
        } else if (user.role === "instructor") {
          return res.redirect("/instructor/dashboard");
        } else {
          // Student dashboard - Use MongoDB-based CourseModel
          const enrolledCourseIds = user.enrolledCourses || [];
          
          // Get user's overall progress using the correct ProgressModel API
          const progressStats = await ProgressModel.getUserOverallProgress(user._id);
          
          // Get course details using CourseModel
          const enrolledCoursesWithProgress = [];
          
          for (const courseId of enrolledCourseIds) {
            const course = await CourseModel.getCourseById(courseId);
            if (course) {
              // Get individual course progress
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
