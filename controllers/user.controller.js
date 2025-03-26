const UserModel = require("../models/user.model");
const CourseModel = require("../models/course.model");
const ProgressModel = require("../models/progress.model");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");

// User controller
const UserController = {
  // Get student dashboard
  getStudentDashboard: (req, res) => {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const userId = req.session.user.id;
    const enrolledCourses = UserModel.getUserEnrolledCourses(userId);
    const progress = ProgressModel.getUserOverallProgress(userId);

    // Get recommended courses (not enrolled)
    const allCourses = CourseModel.getAllCourses();
    const enrolledIds = enrolledCourses.map((course) => course.id);
    const recommendedCourses = allCourses
      .filter((course) => !enrolledIds.includes(course.id))
      .slice(0, 3);

    res.render("dashboard/student", {
      enrolledCourses,
      progress,
      recommendedCourses,
    });
  },

 // Get user profile
getUserProfile: (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  const userId = req.session.user.id;
  const user = UserModel.getUserById(userId);

  if (!user) {
    req.flash("error_msg", "User not found");
    return res.redirect("/");
  }

  // Fetch the count of admins
  const adminCount = UserModel.getAdminCount();

  res.render("user/profile", { user, adminCount });
},

// Update user profile
updateUserProfile: (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  const userId = req.session.user.id;
  const { name, email, currentPassword, newPassword, confirmPassword } = req.body;
  const updates = { name, email };
  
  try {
    // If user is attempting to change password
    if (newPassword && newPassword.trim() !== '') {
      // Check that passwords match
      if (newPassword !== confirmPassword) {
        req.flash("error_msg", "New passwords do not match");
        return res.redirect("/user/profile");
      }
      
      // Verify current password
      const user = UserModel.getUserById(userId);
      const isValid = currentPassword === user.password; // Using direct comparison as it seems passwords aren't hashed
      
      if (!isValid) {
        req.flash("error_msg", "Current password is incorrect");
        return res.redirect("/user/profile");
      }
      
      // Add password to updates
      updates.password = newPassword;
    }

    // Use the model to update the user data
    const updatedUser = UserModel.updateUser(userId, updates);
    
    // Update session data
    req.session.user = {
      ...req.session.user,
      name: updatedUser.name,
      email: updatedUser.email
    };
    
    // Read to verify the update was saved
    const dataPath = path.join(__dirname, "../data/data.json");
    const rawData = fs.readFileSync(dataPath);
    const data = JSON.parse(rawData);
    const userInData = data.users.find(u => u.id === userId);
    
    if (userInData) {
      console.log("User successfully updated in data.json");
    } else {
      console.log("Warning: User not found in data.json after update");
    }

    req.flash("success_msg", "Profile updated successfully");
    res.redirect("/user/profile");
  } catch (error) {
    console.error("Profile update error:", error);
    req.flash("error_msg", error.message || "Error updating profile");
    res.redirect("/user/profile");
  }
},

  // Change password
  changePassword: (req, res) => {
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
      const user = UserModel.getUserById(userId);
      const isValid = bcrypt.compareSync(currentPassword, user.password);

      if (!isValid) {
        req.flash("error_msg", "Current password is incorrect");
        return res.redirect("/user/profile");
      }

      // Update password
      const hashedPassword = newPassword;
      UserModel.updateUser(userId, { password: hashedPassword });

      req.flash("success_msg", "Password changed successfully");
      res.redirect("/user/profile");
    } catch (error) {
      req.flash("error_msg", error.message);
      res.redirect("/user/profile");
    }
  },

  // Get user's enrolled courses
  getUserCourses: (req, res) => {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const userId = req.session.user.id;
    const enrolledCourses = UserModel.getUserEnrolledCourses(userId);

    res.render("user/courses", { enrolledCourses });
  },

  deleteUser: (req, res) => {
    console.log('Reached controller');
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const userId = req.params.id; // Get user ID from request parameters

    try {
      UserModel.deleteUser(userId); // Call delete function from userModel
      req.flash("success_msg", "User deleted successfully");
      res.redirect("/admin/users"); // Redirect to user management page
    } catch (error) {
      req.flash("error_msg", error.message);
      res.redirect("/admin/users");
    }
  }
};

module.exports = UserController;
