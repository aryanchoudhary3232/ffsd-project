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

    // Validation functions
    const validateName = (name) => {
      if (!name || typeof name !== "string") {
        return "Name is required";
      }
      const trimmedName = name.trim();
      if (!trimmedName) {
        return "Name cannot be empty";
      }
      if (trimmedName.length < 2) {
        return "Name must be at least 2 characters long";
      }
      if (trimmedName.length > 50) {
        return "Name must be less than 50 characters";
      }
      // Only allow letters, spaces, and common name characters
      const nameRegex = /^[a-zA-Z\s'-]+$/;
      if (!nameRegex.test(trimmedName)) {
        return "Name can only contain letters, spaces, apostrophes, and hyphens";
      }
      return null;
    };

    const validateEmail = (email) => {
      if (!email || typeof email !== "string") {
        return "Email is required";
      }
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail) {
        return "Email cannot be empty";
      }
      // Check for basic email format: xyz@abc.com
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/;
      if (!emailRegex.test(trimmedEmail)) {
        return "Please enter a valid email address in format: xyz@abc.com";
      }
      return null;
    };

    const validatePassword = (password) => {
      if (!password) return null; // Password is optional for updates
      if (password.length < 6) {
        return "Password must be at least 6 characters long";
      }
      if (password.length > 128) {
        return "Password must be less than 128 characters";
      }
      // Check for at least one letter and one number
      if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
        return "Password must contain at least one letter and one number";
      }
      return null;
    };

    // Validate name
    const nameError = validateName(name);
    if (nameError) {
      req.flash("error_msg", nameError);
      return res.redirect("/user/profile");
    }

    // Validate email
    const emailError = validateEmail(email);
    if (emailError) {
      req.flash("error_msg", emailError);
      return res.redirect("/user/profile");
    }

    // Set updates after validation
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    
    updates.name = trimmedName;
    updates.username = trimmedName;
    updates.email = trimmedEmail;

    try {
      const user = await User.findById(userId);
      if (!user) {
          req.flash("error_msg", "User not found.");
          return res.redirect("/user/profile");
      }

      // Check if email is already taken by another user
      if (updates.email !== user.email) {
        const existingUser = await User.findOne({ email: updates.email, _id: { $ne: userId } });
        if (existingUser) {
          req.flash("error_msg", "Email is already in use by another account");
          return res.redirect("/user/profile");
        }
      }

      // Password validation and update
      if (newPassword && newPassword.trim() !== '') {
        const passwordError = validatePassword(newPassword);
        if (passwordError) {
          req.flash("error_msg", passwordError);
          return res.redirect("/user/profile");
        }

        if (newPassword !== confirmPassword) {
          req.flash("error_msg", "New passwords do not match");
          return res.redirect("/user/profile");
        }

        if (!currentPassword) {
          req.flash("error_msg", "Current password is required to change password");
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
