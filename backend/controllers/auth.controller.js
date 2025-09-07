const User = require("../models/User");
const bcrypt = require("bcryptjs");

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: "Authentication required",
  });
};

// Role middleware
const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === "admin") {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Admin access required",
  });
};

const isInstructor = (req, res, next) => {
  if (
    req.session.user &&
    (req.session.user.role === "instructor" ||
      req.session.user.role === "admin")
  ) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Instructor access required",
  });
};

const AuthController = {
  apiLogin: async (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = (email || "").toLowerCase();

    try {
      const user = await User.findOne({ email: normalizedEmail });
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

      // Regenerate session to prevent fixation and ensure set-cookie
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regenerate error:", err);
          return res.status(500).json({
            success: false,
            message: "Could not establish session",
          });
        }

        req.session.user = {
          id: user._id,
          username: user.username,
          name: user.username,
          email: user.email,
          role: user.role,
        };

        req.session.save(() => {
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
        });
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
    const normalizedEmail = (email || "").toLowerCase();

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
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User with this email already exists",
        });
      }

      // Create new user
      const newUser = new User({
        username: finalUsername,
        email: normalizedEmail,
        password,
        role: (role === "teacher" ? "instructor" : role) || "student",
      });

      await newUser.save();

      // Auto-login newly registered user with session regenerate+save
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regenerate error (register):", err);
          return res.status(201).json({
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
        }

        req.session.user = {
          id: newUser._id,
          username: newUser.username,
          name: newUser.username,
          email: newUser.email,
          role: newUser.role,
        };

        req.session.save(() => {
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
        });
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

module.exports = {
  AuthController,
  isAuthenticated,
  isAdmin,
  isInstructor,
};
