const User = require("../models/User");
const Course = require("../models/Course");

const AdminController = {
  // Dashboard statistics
  getDashboardStats: async (req, res) => {
    try {
      // Get counts
      const userCount = await User.countDocuments();
      const courseCount = await Course.countDocuments();

      // Get user stats by role
      const students = await User.countDocuments({ role: "student" });
      const instructors = await User.countDocuments({ role: "instructor" });
      const admins = await User.countDocuments({ role: "admin" });

      // Get recent users
      const recentUsers = await User.find()
        .select("username email role createdAt")
        .sort("-createdAt")
        .limit(5);

      // Get popular courses
      const popularCourses = await Course.find()
        .select("title slug enrollments rating")
        .sort("-enrollments")
        .limit(5);

      // Get total enrollments
      const enrollmentStats = await Course.aggregate([
        {
          $group: {
            _id: null,
            totalEnrollments: { $sum: "$enrollments" },
            avgRating: { $avg: "$rating" },
          },
        },
      ]);

      const totalEnrollments = enrollmentStats[0]?.totalEnrollments || 0;
      const avgCourseRating = enrollmentStats[0]?.avgRating || 0;

      res.json({
        success: true,
        data: {
          userCount,
          courseCount,
          totalEnrollments,
          avgCourseRating,
          userStats: {
            students,
            instructors,
            admins,
          },
          recentUsers,
          popularCourses,
        },
      });
    } catch (error) {
      console.error("Error getting admin stats:", error);
      res.status(500).json({
        success: false,
        message: "Error retrieving admin statistics",
        error: error.message,
      });
    }
  },

  // User management
  getAllUsers: async (req, res) => {
    try {
      const {
        role,
        search,
        sort = "-createdAt",
        page = 1,
        limit = 10,
      } = req.query;

      const query = {};

      // Filter by role
      if (role) query.role = role;

      // Search
      if (search) {
        query.$or = [
          { username: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      // Pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Execute query
      const users = await User.find(query)
        .select("-password")
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count for pagination
      const total = await User.countDocuments(query);

      res.json({
        success: true,
        count: users.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        data: users,
      });
    } catch (error) {
      console.error("Error getting users:", error);
      res.status(500).json({
        success: false,
        message: "Error retrieving users",
        error: error.message,
      });
    }
  },

  // Course management
  getAllCourses: async (req, res) => {
    try {
      const {
        category,
        instructor,
        search,
        sort = "-createdAt",
        page = 1,
        limit = 10,
      } = req.query;

      const query = {};

      // Filter by category
      if (category) query.category = category;

      // Filter by instructor
      if (instructor) query.instructor = instructor;

      // Search
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      // Pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Execute query
      const courses = await Course.find(query)
        .populate("instructor", "username name email")
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count for pagination
      const total = await Course.countDocuments(query);

      res.json({
        success: true,
        count: courses.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        data: courses,
      });
    } catch (error) {
      console.error("Error getting courses:", error);
      res.status(500).json({
        success: false,
        message: "Error retrieving courses",
        error: error.message,
      });
    }
  },

  // Update user role
  updateUserRole: async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

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

  // Delete user
  deleteUser: async (req, res) => {
    try {
      const { userId } = req.params;

      const user = await User.findByIdAndDelete(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
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

  // Approve/reject course
  updateCourseStatus: async (req, res) => {
    try {
      const { courseId } = req.params;
      const { status, reason } = req.body;

      // Validate status
      const validStatuses = ["approved", "rejected", "pending"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status",
        });
      }

      // Update course status
      const course = await Course.findByIdAndUpdate(
        courseId,
        {
          status,
          rejectionReason: status === "rejected" ? reason : undefined,
        },
        { new: true }
      );

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      res.json({
        success: true,
        message: `Course ${status} successfully`,
        data: course,
      });
    } catch (error) {
      console.error("Error updating course status:", error);
      res.status(500).json({
        success: false,
        message: "Error updating course status",
        error: error.message,
      });
    }
  },

  // Delete course
  deleteCourse: async (req, res) => {
    try {
      const { courseId } = req.params;

      const course = await Course.findById(courseId);

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      // Remove course from instructor's courses
      await User.findByIdAndUpdate(course.instructor, {
        $pull: { courses: courseId },
      });

      // Delete the course
      await Course.findByIdAndDelete(courseId);

      res.json({
        success: true,
        message: "Course deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting course:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting course",
        error: error.message,
      });
    }
  },

  // Get system settings
  getSettings: async (req, res) => {
    try {
      // This would typically come from a Settings model
      // For now, we'll return mock data
      res.json({
        success: true,
        data: {
          siteName: "Learning Platform",
          contactEmail: "admin@example.com",
          allowPublicRegistration: true,
          autoApproveInstructors: false,
          autoApproveCourses: false,
          maintenanceMode: false,
          categories: [
            "Web Development",
            "Mobile Development",
            "Data Science",
            "Machine Learning",
            "DevOps",
            "Business",
            "Design",
            "Marketing",
          ],
          languages: [
            "English",
            "Spanish",
            "French",
            "German",
            "Chinese",
            "Japanese",
            "Hindi",
          ],
          levels: ["Beginner", "Intermediate", "Advanced", "All Levels"],
        },
      });
    } catch (error) {
      console.error("Error getting settings:", error);
      res.status(500).json({
        success: false,
        message: "Error retrieving settings",
        error: error.message,
      });
    }
  },

  // Update system settings
  updateSettings: async (req, res) => {
    try {
      const settings = req.body;

      // This would typically update a Settings model
      // For now, we'll just return success
      res.json({
        success: true,
        message: "Settings updated successfully",
        data: settings,
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({
        success: false,
        message: "Error updating settings",
        error: error.message,
      });
    }
  },
};

module.exports = AdminController;
