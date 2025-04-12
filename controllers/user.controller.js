const User = require("../models/User"); // Assuming Mongoose User model
const Course = require("../models/course.model"); // Fixed path to Course model
const Progress = require("../models/progress.model"); // Fixed path to Progress model
const bcrypt = require("bcryptjs"); // Use bcryptjs or bcrypt
// Remove fs and path if only used for data.json
// const fs = require("fs");
// const path = require("path");

// User controller
const UserController = {
  // Get student dashboard
  getStudentDashboard: async (req, res) => { // Add async
    if (!req.session.user) {
      return res.redirect("/login");
    }

    try { // Add try-catch
        const userId = req.session.user.id;

        // Fetch user with populated enrolled courses
        const user = await User.findById(userId).populate('enrolledCourses');
        if (!user) {
            req.flash("error_msg", "User not found");
            return res.redirect("/login");
        }

        const progressRecords = await Progress.find({ userId: userId });

        // Map progress to enrolled courses
        const enrolledCoursesWithProgress = user.enrolledCourses.map(course => {
            const progress = progressRecords.find(p => p.courseId.equals(course._id));
            return {
                ...course.toObject(), // Convert Mongoose doc to plain object
                progress: progress ? progress.progress : 0
            };
        });

        // Calculate overall progress stats
        const overallProgress = progressRecords.length > 0
            ? Math.round(progressRecords.reduce((sum, p) => sum + p.progress, 0) / progressRecords.length)
            : 0;
        const progressStats = {
            completedCourses: progressRecords.filter(p => p.progress === 100).length,
            inProgressCourses: progressRecords.filter(p => p.progress > 0 && p.progress < 100).length,
            averageProgress: overallProgress
        };

        // Get recommended courses (not enrolled)
        const enrolledIds = user.enrolledCourses.map((course) => course._id);
        const recommendedCourses = await Course.find({ _id: { $nin: enrolledIds } }).limit(3); // Find courses not in enrolledIds

        res.render("dashboard/student", {
          enrolledCourses: enrolledCoursesWithProgress,
          progress: progressStats,
          recommendedCourses,
        });
    } catch (error) {
        console.error("Student Dashboard error:", error);
        req.flash("error_msg", "Could not load dashboard.");
        res.redirect('/');
    }
  },

 // Get user profile
getUserProfile: async (req, res) => { // Add async
  if (!req.session.user) {
    return res.redirect("/login");
  }

  try { // Add try-catch
      const userId = req.session.user.id;
      const user = await User.findById(userId); // Use Mongoose findById

      if (!user) {
        req.flash("error_msg", "User not found");
        return res.redirect("/");
      }

      // Fetch the count of admins
      const adminCount = await User.countDocuments({ role: 'admin' }); // Use Mongoose countDocuments

      res.render("user/profile", { user, adminCount });
  } catch (error) {
      console.error("Get Profile error:", error);
      req.flash("error_msg", "Could not load profile.");
      res.redirect('/');
  }
},

// Update user profile
updateUserProfile: async (req, res) => { // Add async
  if (!req.session.user) {
    return res.redirect("/login");
  }

  const userId = req.session.user.id;
  const { name, email, currentPassword, newPassword, confirmPassword } = req.body;
  const updates = { name, email };

  try {
    const user = await User.findById(userId); // Get user first
    if (!user) {
        req.flash("error_msg", "User not found.");
        return res.redirect("/user/profile");
    }

    // If user is attempting to change password
    if (newPassword && newPassword.trim() !== '') {
      // Check that passwords match
      if (newPassword !== confirmPassword) {
        req.flash("error_msg", "New passwords do not match");
        return res.redirect("/user/profile");
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password); // Use bcrypt compare

      if (!isMatch) {
        req.flash("error_msg", "Current password is incorrect");
        return res.redirect("/user/profile");
      }

      // Hash new password (assuming pre-save hook doesn't run on findByIdAndUpdate automatically for password)
      // If pre-save hook exists and handles hashing:
      // updates.password = newPassword;
      // Else, hash manually:
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(newPassword, salt);
    }

    // Use Mongoose to update the user data
    const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true }); // Use Mongoose findByIdAndUpdate

    // Update session data
    req.session.user = {
      ...req.session.user,
      name: updatedUser.name,
      email: updatedUser.email
    };

    // Remove file system check
    // const dataPath = path.join(__dirname, "../data/data.json");
    // ... file check logic removed ...

    req.flash("success_msg", "Profile updated successfully");
    res.redirect("/user/profile");
  } catch (error) {
    console.error("Profile update error:", error);
    req.flash("error_msg", error.message || "Error updating profile");
    res.redirect("/user/profile");
  }
},

  // Change password (Note: This overlaps with updateUserProfile, consider merging or removing)
  changePassword: async (req, res) => { // Add async
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const userId = req.session.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validation
    if (newPassword !== confirmPassword) {
      req.flash("error_msg", "New passwords do not match");
      return res.redirect("/user/profile");
    }

    try {
      // Verify current password
      const user = await User.findById(userId); // Use Mongoose findById
      if (!user) {
          req.flash("error_msg", "User not found.");
          return res.redirect("/user/profile");
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password); // Use bcrypt compare

      if (!isMatch) {
        req.flash("error_msg", "Current password is incorrect");
        return res.redirect("/user/profile");
      }

      // Hash and Update password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      await User.findByIdAndUpdate(userId, { password: hashedPassword }); // Use Mongoose findByIdAndUpdate

      req.flash("success_msg", "Password changed successfully");
      res.redirect("/user/profile");
    } catch (error) {
      console.error("Change Password error:", error);
      req.flash("error_msg", error.message || "Error changing password");
      res.redirect("/user/profile");
    }
  },

  // Get user's enrolled courses
  getUserCourses: async (req, res) => { // Add async
    if (!req.session.user) {
      return res.redirect("/login");
    }

    try { // Add try-catch
        const userId = req.session.user.id;
        // Fetch user with populated enrolled courses
        const user = await User.findById(userId).populate('enrolledCourses');
        if (!user) {
            req.flash("error_msg", "User not found.");
            return res.redirect('/dashboard');
        }

        const progressRecords = await Progress.find({ userId: userId });

        // Map progress to enrolled courses
        const enrolledCoursesWithProgress = user.enrolledCourses.map(course => {
            const progress = progressRecords.find(p => p.courseId.equals(course._id));
            return {
                ...course.toObject(), // Convert Mongoose doc to plain object
                progress: progress ? progress.progress : 0
            };
        });

        res.render("user/courses", { enrolledCourses: enrolledCoursesWithProgress });
    } catch (error) {
        console.error("Get User Courses error:", error);
        req.flash("error_msg", "Could not load courses.");
        res.redirect('/dashboard');
    }
  },

  deleteUser: async (req, res) => { // Add async
    // console.log('Reached controller'); // Keep for debugging if needed
    // Permission check should ideally be in middleware or route definition
    // if (!req.session.user || req.session.user.role !== 'admin') { // Example check
    //   req.flash("error_msg", "Unauthorized");
    //   return res.redirect("/");
    // }

    const userIdToDelete = req.params.id; // Get user ID from request parameters

    try {
      const deletedUser = await User.findByIdAndDelete(userIdToDelete); // Use Mongoose findByIdAndDelete
      if (!deletedUser) {
          req.flash("error_msg", "User not found");
          return res.redirect("/admin/users"); // Or appropriate redirect
      }
      // Add check: prevent deleting self or other admins if needed
      // if (deletedUser._id.equals(req.session.user.id)) { ... }
      // if (deletedUser.role === 'admin') { ... }

      req.flash("success_msg", "User deleted successfully");
      res.redirect("/admin/users"); // Redirect to user management page
    } catch (error) {
      console.error("Delete User error:", error);
      req.flash("error_msg", error.message || "Error deleting user");
      res.redirect("/admin/users"); // Or appropriate redirect
    }
  }
};

module.exports = UserController;
