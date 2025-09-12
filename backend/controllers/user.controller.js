const User = require("../models/User");
const { isAdmin } = require("./auth.controller");

const UserController = {
  // Get user profile
  getUserProfile: async (req, res) => {
    try {
      const userId = req.params.userId || req.session.user.id;

      // Fetch user with enrolled courses
      const user = await User.findById(userId)
        .select("-password")
        .populate("enrolledCourses", "title slug coverImage")
        .populate("courses", "title slug coverImage enrollments");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error("Error getting user profile:", error);
      res.status(500).json({
        success: false,
        message: "Error retrieving user profile",
        error: error.message,
      });
    }
  },

  // Update user profile
  updateUserProfile: async (req, res) => {
    try {
      const userId = req.params.userId || req.session.user.id;

      // Check authorization
      if (
        req.params.userId &&
        req.params.userId !== req.session.user.id &&
        req.session.user.role !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to update this profile",
        });
      }

      const updates = req.body;

      // Don't allow role update unless admin
      if (updates.role && req.session.user.role !== "admin") {
        delete updates.role;
      }

      // Don't allow direct password update through this endpoint
      if (updates.password) {
        delete updates.password;
      }

      // Handle profile picture upload
      if (req.file) {
        updates.profilePicture = `/uploads/${req.file.filename}`;
      }

      // Update user
      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true, runValidators: true }
      ).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Update session user data if it's the current user
      if (userId === req.session.user.id) {
        req.session.user = {
          id: user._id,
          username: user.username,
          name: user.username,
          email: user.email,
          role: user.role,
        };
      }

      res.json({
        success: true,
        message: "Profile updated successfully",
        data: user,
      });
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({
        success: false,
        message: "Error updating user profile",
        error: error.message,
      });
    }
  },

  // Change password
  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      const userId = req.session.user.id;

      // Validate input
      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "All password fields are required",
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "New passwords do not match",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
      }

      // Get user with password
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Check current password
      const bcrypt = require("bcryptjs");
      const isMatch = await bcrypt.compare(currentPassword, user.password);

      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({
        success: false,
        message: "Error changing password",
        error: error.message,
      });
    }
  },

  // Get all users (admin only)
  getAllUsers: async (req, res) => {
    try {
      // Check if admin
      if (req.session.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Admin access required",
        });
      }

      const users = await User.find().select("-password").sort("username");

      res.json({
        success: true,
        count: users.length,
        data: users,
      });
    } catch (error) {
      console.error("Error getting all users:", error);
      res.status(500).json({
        success: false,
        message: "Error retrieving users",
        error: error.message,
      });
    }
  },

  // Delete user (self or admin)
  deleteUser: async (req, res) => {
    try {
      const userId = req.params.userId || req.session.user.id;

      // Check authorization
      if (
        req.params.userId &&
        req.params.userId !== req.session.user.id &&
        req.session.user.role !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to delete this user",
        });
      }

      // Delete user
      const user = await User.findByIdAndDelete(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // If deleting self, logout
      if (userId === req.session.user.id) {
        req.session.destroy();
      }

      res.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting user",
        error: error.message,
      });
    }
  },

  // Update user role (admin only)
  updateUserRole: async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      // Check if admin
      if (req.session.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Admin access required",
        });
      }

      // Validate role
      const validRoles = ["student", "instructor", "admin"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role",
        });
      }

      // Update user role
      const user = await User.findByIdAndUpdate(
        userId,
        { role },
        { new: true }
      ).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        message: "User role updated successfully",
        data: user,
      });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({
        success: false,
        message: "Error updating user role",
        error: error.message,
      });
    }
  },

  // Get user's dashboard data
  getUserDashboard: async (req, res) => {
    try {
      const userId = req.session.user.id;

      // Get user with enrolled courses and created courses
      const user = await User.findById(userId)
        .select("-password")
        .populate("enrolledCourses")
        .populate("courses");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Prepare dashboard data based on role
      const dashboardData = {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          profilePicture: user.profilePicture,
        },
        enrolledCourses: user.enrolledCourses || [],
        enrolledCoursesCount: user.enrolledCourses?.length || 0,
      };

      // Add instructor data if applicable
      if (user.role === "instructor" || user.role === "admin") {
        dashboardData.createdCourses = user.courses || [];
        dashboardData.createdCoursesCount = user.courses?.length || 0;

        // Calculate total students/enrollments
        let totalStudents = 0;
        user.courses.forEach((course) => {
          totalStudents += course.enrollments || 0;
        });

        dashboardData.totalStudents = totalStudents;
      }

      res.json({
        success: true,
        data: dashboardData,
      });
    } catch (error) {
      console.error("Error getting dashboard data:", error);
      res.status(500).json({
        success: false,
        message: "Error retrieving dashboard data",
        error: error.message,
      });
    }
  },
};

module.exports = UserController;
