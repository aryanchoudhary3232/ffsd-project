const UserModel = require("../models/user.model");
const ProgressModel = require("../models/progress.model"); // Import ProgressModel

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
  login: (req, res) => {
    const { email, password } = req.body;

    try {
      const user = UserModel.authenticateUser(email, password);
      console.log(user);

      if (!user) {
        req.flash("error_msg", "Invalid email or password");
        return res.redirect("/login");
      }

      // Set user session
      req.session.user = user;

      // Redirect based on role
      if (user.role === "admin") {
        return res.redirect("/admin/dashboard");
      } else if (user.role === "instructor") {
        return res.redirect("/instructor/dashboard");
      } else {
        return res.redirect("/dashboard");
      }
    } catch (error) {
      req.flash("error_msg", error.message);
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
  register: async (req, res) => {
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
      const user = await UserModel.createUser({
        name,
        email,
        password,
        role: role || "student",
      });

      // Set user session
      req.session.user = user;

      // Redirect based on role
      if (user.role === "admin") {
        return res.redirect("/admin/dashboard");
      } else if (user.role === "instructor") {
        return res.redirect("/instructor/dashboard");
      } else {
        return res.redirect("/dashboard");
      }
    } catch (error) {
      req.flash("error_msg", error.message);
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
  getDashboard: (req, res) => {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const user = UserModel.getUserById(req.session.user.id);

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    // Redirect based on role
    if (user.role === "admin") {
      return res.redirect("/admin/dashboard");
    } else if (user.role === "instructor") {
      return res.redirect("/instructor/dashboard");
    } else {
      // Student dashboard
      const enrolledCourses = UserModel.getUserEnrolledCourses(user.id);
      const progress = ProgressModel.getUserOverallProgress(user.id);

      return res.render("dashboard/student", {
        enrolledCourses,
        progress,
      });
    }
  },
};

module.exports = AuthController;
