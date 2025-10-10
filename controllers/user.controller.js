const User = require("../models/User");
const Course = require("../models/course.model");
const Progress = require("../models/progress.model");
const bcrypt = require("bcryptjs");

const UserController = {
  getStudentDashboard: async (req, res) => {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    try {
        const userId = req.session.user.id;
        // const userId = id;
        const user = await User.findById(userId).populate('enrolledCourses');
        
        if (!user) {
            req.flash("error_msg", "User not found");
            return res.redirect("/login");
        }

        const progressRecords = await Progress.find({ userId: userId });

        const enrolledCoursesWithProgress = user.enrolledCourses.map(course => {
            const progress = progressRecords.find(p => p.courseId.equals(course._id));
            return {
                ...course.toObject(),
                progress: progress ? progress.progress : 0
            };
        });

        const overallProgress = progressRecords.length > 0
            ? Math.round(progressRecords.reduce((sum, p) => sum + p.progress, 0) / progressRecords.length)
            : 0;
            
        const progressStats = {
            completedCourses: progressRecords.filter(p => p.progress === 100).length,
            inProgressCourses: progressRecords.filter(p => p.progress > 0 && p.progress < 100).length,
            averageProgress: overallProgress
        };

        const enrolledIds = user.enrolledCourses.map((course) => course._id);
        const recommendedCourses = await Course.find({ _id: { $nin: enrolledIds } }).limit(3);

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

  getUserProfile: async (req, res) => {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    try {
        const userId = req.session.user.id;
        const user = await User.findById(userId);

        if (!user) {
          req.flash("error_msg", "User not found");
          return res.redirect("/");
        }

        const adminCount = await User.countDocuments({ role: 'admin' });
        res.render("user/profile", { user, adminCount });
    } catch (error) {
        console.error("Get Profile error:", error);
        req.flash("error_msg", "Could not load profile.");
        res.redirect('/');
    }
  },

  updateUserProfile: async (req, res) => {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const userId = req.session.user.id;
    const { name, email, currentPassword, newPassword, confirmPassword } = req.body;
    const updates = {};

    if (typeof name === "string") {
      const trimmedName = name.trim();
      if (trimmedName) {
        updates.name = trimmedName;
        updates.username = trimmedName;
      }
    }

    if (typeof email === "string") {
      const trimmedEmail = email.trim();
      if (trimmedEmail) {
        updates.email = trimmedEmail;
      }
    }

    try {
      const user = await User.findById(userId);
      if (!user) {
          req.flash("error_msg", "User not found.");
          return res.redirect("/user/profile");
      }

      if (newPassword && newPassword.trim() !== '') {
        if (newPassword !== confirmPassword) {
          req.flash("error_msg", "New passwords do not match");
          return res.redirect("/user/profile");
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          req.flash("error_msg", "Current password is incorrect");
          return res.redirect("/user/profile");
        }

        const salt = await bcrypt.genSalt(10);
        updates.password = await bcrypt.hash(newPassword, salt);
      }

      const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true });

      req.session.user = {
        ...req.session.user,
        name: updatedUser.name || updatedUser.username,
        username: updatedUser.username || updatedUser.name,
        email: updatedUser.email
      };

      req.flash("success_msg", "Profile updated successfully");
      res.redirect("/user/profile");
    } catch (error) {
      console.error("Profile update error:", error);
      req.flash("error_msg", error.message || "Error updating profile");
      res.redirect("/user/profile");
    }
  },

  changePassword: async (req, res) => {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const userId = req.session.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      req.flash("error_msg", "New passwords do not match");
      return res.redirect("/user/profile");
    }

    try {
      const user = await User.findById(userId);
      if (!user) {
          req.flash("error_msg", "User not found.");
          return res.redirect("/user/profile");
      }
      
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        req.flash("error_msg", "Current password is incorrect");
        return res.redirect("/user/profile");
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      await User.findByIdAndUpdate(userId, { password: hashedPassword });

      req.flash("success_msg", "Password changed successfully");
      res.redirect("/user/profile");
    } catch (error) {
      console.error("Change Password error:", error);
      req.flash("error_msg", error.message || "Error changing password");
      res.redirect("/user/profile");
    }
  },

  getUserCourses: async (req, res) => {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    try {
        const userId = req.session.user.id;
        const user = await User.findById(userId).populate('enrolledCourses');
        
        if (!user) {
            req.flash("error_msg", "User not found.");
            return res.redirect('/dashboard');
        }

        const progressRecords = await Progress.find({ userId: userId });

        const enrolledCoursesWithProgress = user.enrolledCourses.map(course => {
            const progress = progressRecords.find(p => p.courseId.equals(course._id));
            return {
                ...course.toObject(),
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

  deleteUser: async (req, res) => {
    const userIdToDelete = req.params.id;

    try {
      const deletedUser = await User.findByIdAndDelete(userIdToDelete);
      if (!deletedUser) {
          req.flash("error_msg", "User not found");
          return res.redirect("/admin/users");
      }

      req.flash("success_msg", "User deleted successfully");
      res.redirect("/admin/users");
    } catch (error) {
      console.error("Delete User error:", error);
      req.flash("error_msg", error.message || "Error deleting user");
      res.redirect("/admin/users");
    }
  }
};

module.exports = UserController;
