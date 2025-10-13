const User = require("../models/User");
const Course = require("../models/course.model");
const Order = require("../models/order.model");
const bcrypt = require("bcrypt");

const AdminController = {
  isValidObjectId: (id) => {
    const ObjectId = require("mongoose").Types.ObjectId;
    return ObjectId.isValid(id) && new ObjectId(id).toString() === id;
  },

  getAdminDashboard: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    try {
      // Just render the page - data will be loaded via fetch API
      res.render("admin/dashboard", {
        stats: {
          totalUsers: 0,
          totalInstructors: 0,
          totalCourses: 0,
          totalRevenue: 0,
          userDistribution: {
            students: { percentage: 0 },
            instructors: { percentage: 0 },
            admins: { percentage: 0 },
          },
        },
        recentUsers: [],
        recentCourses: [],
      });
    } catch (error) {
      console.error("Admin Dashboard page error:", error);
      req.flash("error_msg", "Could not load dashboard page.");
      res.redirect("/");
    }
  },

  // API endpoint to fetch dashboard data
  getDashboardAPI: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    try {
      const [
        totalUsers,
        totalInstructors,
        totalStudents,
        totalAdmins,
        totalCourses,
        completedOrders,
        recentUsersData,
        allCourses,
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: "instructor" }),
        User.countDocuments({ role: "student" }),
        User.countDocuments({ role: "admin" }),
        Course.getCourseCount(),
        Order.getAllOrders(),
        User.find().sort({ joinDate: -1 }).limit(5),
        Course.getAllCourses(),
      ]);

      // Manually sort and limit courses
      const recentCoursesData = allCourses
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

      // Since we don't have populate functionality, we need to manually fetch instructor data
      const recentCoursesWithInstructors = await Promise.all(
        recentCoursesData.map(async (course) => {
          let instructorName = course.instructor; // Use existing instructor field first

          // If no instructor field, try to fetch by instructorId
          if (
            !instructorName &&
            course.instructorId &&
            AdminController.isValidObjectId(course.instructorId)
          ) {
            const instructor = await User.findById(course.instructorId);
            instructorName = instructor
              ? instructor.username || instructor.name || instructor.email
              : null;
          }

          return {
            ...course,
            instructor: instructorName || "Unknown Instructor",
          };
        })
      );

      // Filter completed orders since we got all orders
      const filteredCompletedOrders = completedOrders.filter(
        (order) => order.status === "completed"
      );
      const totalRevenue = filteredCompletedOrders.reduce(
        (sum, order) => sum + order.amount,
        0
      );

      // Process recent users/courses if needed (e.g., formatting dates)
      const recentUsers = recentUsersData.map((user) => ({
        ...user.toObject(),
      }));

      // Since courses are already plain objects from our custom model, no need for toObject()
      const recentCourses = recentCoursesWithInstructors;

      const userDistribution = {
        students: {
          percentage: totalUsers
            ? ((totalStudents / totalUsers) * 100).toFixed(1)
            : 0,
        },
        instructors: {
          percentage: totalUsers
            ? ((totalInstructors / totalUsers) * 100).toFixed(1)
            : 0,
        },
        admins: {
          percentage: totalUsers
            ? ((totalAdmins / totalUsers) * 100).toFixed(1)
            : 0,
        },
      };

      const stats = {
        totalUsers,
        totalInstructors,
        totalCourses,
        totalRevenue,
        userDistribution,
      };

      // Get course categories distribution
      const categoryStats = {};
      recentCourses.forEach((course) => {
        if (course.category) {
          categoryStats[course.category] =
            (categoryStats[course.category] || 0) + 1;
        }
      });

      // Send JSON response with headers that can be seen in network tab
      res.setHeader("Content-Type", "application/json");
      res.setHeader("X-Total-Users", totalUsers.toString());
      res.setHeader("X-Total-Courses", totalCourses.toString());
      res.setHeader("X-Total-Revenue", totalRevenue.toFixed(2));
      res.setHeader("X-Response-Time", new Date().toISOString());
      res.setHeader(
        "X-Admin-User",
        req.session.user.username || req.session.user.email
      );

      res.status(200).json({
        success: true,
        message: "Dashboard data fetched successfully",
        data: {
          stats: stats,
          recentUsers: recentUsers,
          recentCourses: recentCourses,
          categoryStats: categoryStats,
          systemStatus: {
            database: "operational",
            api: "operational",
            storage: "operational",
          },
          metadata: {
            completedOrders: filteredCompletedOrders.length,
            pendingOrders:
              completedOrders.length - filteredCompletedOrders.length,
            averageRevenuePerOrder:
              filteredCompletedOrders.length > 0
                ? (totalRevenue / filteredCompletedOrders.length).toFixed(2)
                : 0,
            dataFreshness: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        },
        meta: {
          requestId: `dashboard_req_${Date.now()}`,
          apiVersion: "1.0.0",
          queryExecutionTime: Date.now(),
        },
      });
    } catch (error) {
      console.error("Get Dashboard API error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch dashboard data",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  },

  getUsers: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }
    try {
      // Just render the page - data will be loaded via fetch API
      res.render("admin/users", {
        users: [], // Empty array since we'll fetch data via API
      });
    } catch (error) {
      console.error("Get Users page error:", error);
      req.flash("error_msg", "Could not load users page.");
      res.redirect("/admin/dashboard");
    }
  },

  // API endpoint to fetch users data
  getUsersAPI: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    try {
      // Get all users
      let users = await User.find();

      // Process user data to ensure all have valid properties
      users = users.map((user) => {
        const userObj = user.toObject ? user.toObject() : user;
        return {
          ...userObj,
          username:
            userObj.username || userObj.name || userObj.email || "Unknown User",
          email: userObj.email || "N/A",
        };
      });

      // Send JSON response with headers that can be seen in network tab
      res.setHeader("Content-Type", "application/json");
      res.setHeader("X-Total-Users", users.length.toString());
      res.setHeader("X-Response-Time", new Date().toISOString());

      res.status(200).json({
        success: true,
        message: "Users fetched successfully",
        data: {
          users: users,
          totalCount: users.length,
          timestamp: new Date().toISOString(),
        },
        meta: {
          requestId: `req_${Date.now()}`,
          apiVersion: "1.0.0",
        },
      });
    } catch (error) {
      console.error("Get Users API error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch users",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  },

  getEditUserForm: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    try {
      const userId = req.params.id;

      if (!AdminController.isValidObjectId(userId)) {
        req.flash("error_msg", "Invalid User ID format.");
        return res.redirect("/admin/users");
      }

      // Just render the page - data will be loaded via fetch API
      res.render("admin/user-edit", {
        userId: userId,
        user: {
          id: userId,
          _id: userId,
          username: "",
          email: "",
          role: "student",
        },
        adminCount: 0,
      });
    } catch (error) {
      console.error("Get Edit User Form page error:", error);
      req.flash("error_msg", "Could not load user edit page.");
      res.redirect("/admin/users");
    }
  },

  // API endpoint to fetch user edit form data
  getEditUserFormAPI: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    try {
      const userId = req.params.id;

      if (!AdminController.isValidObjectId(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid User ID format",
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Get admin count to prevent removing the last admin
      const adminCount = await User.countDocuments({ role: "admin" });

      // Send JSON response with headers that can be seen in network tab
      res.setHeader("Content-Type", "application/json");
      res.setHeader("X-User-ID", userId);
      res.setHeader("X-User-Role", user.role || "unknown");
      res.setHeader("X-Admin-Count", adminCount.toString());
      res.setHeader(
        "X-Can-Change-Role",
        (user.role !== "admin" || adminCount > 1).toString()
      );
      res.setHeader("X-Response-Time", new Date().toISOString());

      res.status(200).json({
        success: true,
        message: "User edit data fetched successfully",
        data: {
          user: {
            ...(user.toObject ? user.toObject() : user),
            id: user._id,
          },
          adminCount: adminCount,
          canChangeRole: user.role !== "admin" || adminCount > 1,
          isSelf: req.session.user.id === userId.toString(),
          metadata: {
            isLastAdmin: user.role === "admin" && adminCount === 1,
            accountCreated: user.joinDate,
            roleChangeAllowed: user.role !== "admin" || adminCount > 1,
          },
          timestamp: new Date().toISOString(),
        },
        meta: {
          requestId: `user_edit_req_${Date.now()}`,
          apiVersion: "1.0.0",
          userId: userId,
        },
      });
    } catch (error) {
      console.error("Get User Edit Form API error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch user edit data",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  },

  updateUser: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const userId = req.params.id;
    const { name, email, role } = req.body;

    const buildUpdatePayload = (includeRole = true) => {
      const payload = {};

      if (typeof name === "string") {
        const trimmedName = name.trim();
        if (trimmedName) {
          payload.name = trimmedName;
          payload.username = trimmedName;
        }
      }

      if (typeof email === "string") {
        const trimmedEmail = email.trim();
        if (trimmedEmail) {
          payload.email = trimmedEmail;
        }
      }

      if (includeRole && role) {
        payload.role = role;
      }

      return payload;
    };

    try {
      const user = await User.findById(userId);
      if (!user) {
        req.flash("error_msg", "User not found");
        return res.redirect("/admin/users");
      }

      // Prevent changing own role or another admin's role
      if (
        user.role === "admin" &&
        (role !== "admin" || user._id.equals(req.session.user.id))
      ) {
        if (user._id.equals(req.session.user.id) && role !== "admin") {
          req.flash("error_msg", "Cannot change your own role.");
        } else if (role !== "admin") {
          const adminCount = await User.countDocuments({ role: "admin" });
          if (adminCount <= 1) {
            req.flash("error_msg", "Cannot remove the last admin.");
            return res.redirect("/admin/users");
          }
          req.flash("error_msg", "Cannot change the role of an admin user.");
        }
        if (user.role === "admin" && role !== "admin") {
          req.flash("error_msg", "Admin role cannot be changed.");
          const adminUpdate = await User.findByIdAndUpdate(
            userId,
            buildUpdatePayload(false),
            { new: true }
          );
          if (
            adminUpdate &&
            req.session.user &&
            req.session.user.id === userId.toString()
          ) {
            req.session.user = {
              ...req.session.user,
              name: adminUpdate.name || adminUpdate.username,
              username: adminUpdate.username || adminUpdate.name,
              email: adminUpdate.email,
            };
          }
          req.flash("success_msg", "Admin user info (excluding role) updated.");
          return res.redirect("/admin/users");
        }
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        buildUpdatePayload(true),
        { new: true }
      );
      if (
        updatedUser &&
        req.session.user &&
        req.session.user.id === userId.toString()
      ) {
        req.session.user = {
          ...req.session.user,
          name: updatedUser.name || updatedUser.username,
          username: updatedUser.username || updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
        };
      }
      req.flash("success_msg", "User updated successfully");
      res.redirect("/admin/users");
    } catch (error) {
      console.error("Update User error:", error);
      req.flash("error_msg", error.message || "Error updating user.");
      res.redirect("/admin/users");
    }
  },

  deleteUser: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const userId = req.params.id;

    try {
      const user = await User.findById(userId);

      if (!user) {
        req.flash("error_msg", "User not found");
        return res.redirect("/admin/users");
      }

      if (user._id.equals(req.session.user.id)) {
        req.flash("error_msg", "Cannot delete yourself.");
        return res.redirect("/admin/users");
      }
      if (user.role === "admin") {
        const adminCount = await User.countDocuments({ role: "admin" });
        if (adminCount <= 1) {
          req.flash("error_msg", "Cannot delete the last admin user.");
          return res.redirect("/admin/users");
        }
        req.flash("error_msg", "Cannot delete an admin user.");
        return res.redirect("/admin/users");
      }

      await User.findByIdAndDelete(userId);

      req.flash("success_msg", "User deleted successfully");
      res.redirect("/admin/users");
    } catch (error) {
      console.error("Delete User error:", error);
      req.flash("error_msg", error.message || "Error deleting user.");
      res.redirect("/admin/users");
    }
  },

  getCourses: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    try {
      // Just render the page - data will be loaded via fetch API
      res.render("admin/courses", {
        courses: [], // Empty array since we'll fetch data via API
        categories: [], // Will be populated by API
        languages: [], // Will be populated by API
        search: req.query.search || "",
        category: req.query.category || "all",
        language: req.query.language || "all",
        sort: req.query.sort || "newest",
      });
    } catch (error) {
      console.error("Get Courses page error:", error);
      req.flash("error_msg", "Could not load courses page.");
      res.redirect("/admin/dashboard");
    }
  },

  // API endpoint to fetch courses data
  getCoursesAPI: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const {
      search = "",
      category = "all",
      language = "all",
      sort = "newest",
    } = req.query;

    try {
      // Get courses with search and filter criteria
      let courses;
      if (search) {
        courses = await Course.searchCourses(search);
      } else {
        courses = await Course.getAllCourses();
      }

      // Apply filters manually since the Course model methods don't support all the filtering options
      if (category !== "all") {
        courses = courses.filter((course) => course.category === category);
      }

      if (language !== "all") {
        courses = courses.filter(
          (course) => course.courseLanguage === language
        );
      }

      // Apply sorting
      switch (sort) {
        case "oldest":
          courses.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          break;
        case "title-asc":
          courses.sort((a, b) => a.title.localeCompare(b.title));
          break;
        case "title-desc":
          courses.sort((a, b) => b.title.localeCompare(a.title));
          break;
        case "price-low":
          courses.sort((a, b) => a.price - b.price);
          break;
        case "price-high":
          courses.sort((a, b) => b.price - a.price);
          break;
        default:
          courses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }

      // Enhance courses with instructor data and student count
      const enhancedCoursesPromises = courses.map(async (course) => {
        let instructorName = course.instructor || "Unknown Instructor";

        if (
          course.instructorId &&
          AdminController.isValidObjectId(course.instructorId)
        ) {
          try {
            const instructor = await User.findById(course.instructorId);
            if (instructor) {
              instructorName =
                instructor.name ||
                instructor.username ||
                instructor.email ||
                course.instructor ||
                "Unknown Instructor";
            }
          } catch (error) {
            console.error(
              `Error fetching instructor for course ${course.title}:`,
              error
            );
          }
        }

        const studentCount = await User.countDocuments({
          enrolledCourses: course._id,
        });

        return {
          ...course,
          students: studentCount,
          instructor: instructorName,
        };
      });
      const enhancedCourses = await Promise.all(enhancedCoursesPromises);

      // Get categories and languages for filters
      const categories = await Course.getAllCategories();
      const languages = [
        ...new Set(
          enhancedCourses
            .map((course) => course.courseLanguage)
            .filter((lang) => lang)
        ),
      ];

      // Send JSON response with headers that can be seen in network tab
      res.setHeader("Content-Type", "application/json");
      res.setHeader("X-Total-Courses", enhancedCourses.length.toString());
      res.setHeader("X-Response-Time", new Date().toISOString());
      res.setHeader("X-Search-Query", search || "none");
      res.setHeader("X-Category-Filter", category);
      res.setHeader("X-Language-Filter", language);
      res.setHeader("X-Sort-Order", sort);

      res.status(200).json({
        success: true,
        message: "Courses fetched successfully",
        data: {
          courses: enhancedCourses,
          categories: categories,
          languages: languages,
          totalCount: enhancedCourses.length,
          filters: {
            search: search,
            category: category,
            language: language,
            sort: sort,
          },
          timestamp: new Date().toISOString(),
        },
        meta: {
          requestId: `courses_req_${Date.now()}`,
          apiVersion: "1.0.0",
          queryParams: req.query,
        },
      });
    } catch (error) {
      console.error("Get Courses API error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch courses",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  },

  // API endpoint to fetch course details
  getCourseDetailsAPI: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    try {
      const courseId = req.params.id;

      if (!AdminController.isValidObjectId(courseId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid course ID format",
        });
      }

      const course = await Course.getCourseById(courseId);

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      // Find the instructor separately since we can't use populate
      let instructor = null;
      if (
        course.instructorId &&
        AdminController.isValidObjectId(course.instructorId)
      ) {
        instructor = await User.findById(course.instructorId);
      }

      // Ensure instructor is never undefined, provide default values
      const instructorName =
        instructor?.name ||
        instructor?.username ||
        course.instructor ||
        "Unknown Instructor";

      const instructorData = {
        name: instructorName,
        username: instructorName,
        email: instructor?.email || "N/A",
        id: instructor?._id || null,
      };

      // Find enrolled students
      let enrolledStudents = await User.find(
        { enrolledCourses: courseId },
        "name email"
      );

      // Process student data to ensure all properties exist and are valid
      enrolledStudents = enrolledStudents.map((student) => {
        const studentObj = student.toObject ? student.toObject() : student;
        return {
          ...studentObj,
          name: studentObj.name || "Unknown Student",
          email: studentObj.email || "N/A",
          id: studentObj._id || null,
        };
      });

      // Send JSON response with headers that can be seen in network tab
      res.setHeader("Content-Type", "application/json");
      res.setHeader("X-Course-ID", courseId);
      res.setHeader("X-Course-Title", course.title || "Unknown");
      res.setHeader("X-Course-Status", course.status || "draft");
      res.setHeader("X-Enrolled-Students", enrolledStudents.length.toString());
      res.setHeader("X-Response-Time", new Date().toISOString());

      res.status(200).json({
        success: true,
        message: "Course details fetched successfully",
        data: {
          course: {
            ...course,
            instructor: instructorData.username,
            students: enrolledStudents.length,
            rating: course.rating || 0,
          },
          instructor: instructorData,
          enrolledStudents: enrolledStudents,
          metadata: {
            totalEnrolledStudents: enrolledStudents.length,
            courseAge: course.createdAt
              ? Math.floor(
                  (new Date() - new Date(course.createdAt)) /
                    (1000 * 60 * 60 * 24)
                )
              : 0,
            lastUpdated: course.updatedAt || course.createdAt,
          },
          timestamp: new Date().toISOString(),
        },
        meta: {
          requestId: `course_details_req_${Date.now()}`,
          apiVersion: "1.0.0",
          courseId: courseId,
        },
      });
    } catch (error) {
      console.error("Get Course Details API error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch course details",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  },

  getNewCourseForm: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    try {
      // Just render the page - data will be loaded via fetch API
      res.render("admin/edit-course", {
        course: null, // No course data for new course form
        instructors: [], // Will be populated by API
        formAction: "/admin/courses", // POST to create new course
        formTitle: "Create New Course",
      });
    } catch (error) {
      console.error("Get New Course Form error:", error);
      req.flash("error_msg", "Could not load course form.");
      res.redirect("/admin/courses");
    }
  },

  // API endpoint to fetch new course form data
  getNewCourseFormAPI: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    try {
      // Get instructors for dropdown
      const instructors = await User.find({ role: "instructor" }, "name email");

      // Get categories for dropdown
      const categories = await Course.getAllCategories();

      // Send JSON response with headers that can be seen in network tab
      res.setHeader("Content-Type", "application/json");
      res.setHeader("X-Available-Instructors", instructors.length.toString());
      res.setHeader("X-Available-Categories", categories.length.toString());
      res.setHeader("X-Form-Type", "new-course");
      res.setHeader("X-Response-Time", new Date().toISOString());

      res.status(200).json({
        success: true,
        message: "New course form data fetched successfully",
        data: {
          course: null, // No existing course data
          instructors: instructors.map((instructor) => ({
            id: instructor._id,
            name: instructor.name || instructor.username || "Unknown",
            email: instructor.email || "N/A",
          })),
          categories: categories,
          formAction: "/admin/courses",
          formTitle: "Create New Course",
          metadata: {
            totalInstructors: instructors.length,
            totalCategories: categories.length,
            isNewCourse: true,
          },
          timestamp: new Date().toISOString(),
        },
        meta: {
          requestId: `new_course_req_${Date.now()}`,
          apiVersion: "1.0.0",
          formType: "new-course",
        },
      });
    } catch (error) {
      console.error("Get New Course Form API error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch new course form data",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  },

  getCourseDetails: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }
    try {
      const courseId = req.params.id;

      if (!AdminController.isValidObjectId(courseId)) {
        req.flash("error_msg", "Invalid course ID format.");
        return res.redirect("/admin/courses");
      }

      // Just render the page - data will be loaded via fetch API
      res.render("admin/course-details", {
        course: {
          _id: courseId,
          title: "Loading...",
          instructor: "Loading...",
          students: 0,
          rating: 0,
          price: 0,
          status: "loading",
          category: "Loading...",
          thumbnail: "/img/placeholder.svg",
        },
        instructor: {
          name: "Loading...",
          username: "Loading...",
          email: "N/A",
          id: null,
        },
        enrolledStudents: [],
        success_msg: req.flash("success_msg"),
        error_msg: req.flash("error_msg"),
      });
    } catch (error) {
      console.error("Get Course Details page error:", error);
      req.flash("error_msg", "Could not load course details page.");
      res.redirect("/admin/courses");
    }
  },

  getEditCourseForm: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    try {
      const courseId = req.params.id;

      if (!AdminController.isValidObjectId(courseId)) {
        req.flash("error_msg", "Invalid course ID format.");
        return res.redirect("/admin/courses");
      }

      // Just render the page - data will be loaded via fetch API
      res.render("admin/edit-course", {
        course: {
          _id: courseId,
          title: "",
          description: "",
          category: "",
          price: 0,
          status: "draft",
          featured: false,
          instructorId: null,
          language: "",
          thumbnail: "/img/placeholder.svg",
        },
        instructors: [], // Will be populated by API
        formAction: `/admin/courses/${courseId}?_method=PUT`,
        formTitle: "Edit Course",
      });
    } catch (error) {
      console.error("Get Edit Course Form page error:", error);
      req.flash("error_msg", "Could not load course edit page.");
      res.redirect("/admin/courses");
    }
  },

  // API endpoint to fetch course edit form data
  getEditCourseFormAPI: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    try {
      const courseId = req.params.id;

      if (!AdminController.isValidObjectId(courseId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid course ID format",
        });
      }

      const course = await Course.getCourseById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      // Get instructors for dropdown
      const instructors = await User.find({ role: "instructor" }, "name email");

      // Get categories for dropdown
      const categories = await Course.getAllCategories();

      // Send JSON response with headers that can be seen in network tab
      res.setHeader("Content-Type", "application/json");
      res.setHeader("X-Course-ID", courseId);
      res.setHeader("X-Course-Title", course.title || "Unknown");
      res.setHeader("X-Available-Instructors", instructors.length.toString());
      res.setHeader("X-Available-Categories", categories.length.toString());
      res.setHeader("X-Response-Time", new Date().toISOString());

      res.status(200).json({
        success: true,
        message: "Course edit data fetched successfully",
        data: {
          course: course,
          instructors: instructors.map((instructor) => ({
            id: instructor._id,
            name: instructor.name || instructor.username || "Unknown",
            email: instructor.email || "N/A",
          })),
          categories: categories,
          formAction: `/admin/courses/${courseId}?_method=PUT`,
          formTitle: "Edit Course",
          metadata: {
            totalInstructors: instructors.length,
            totalCategories: categories.length,
            courseStatus: course.status || "draft",
            courseCreated: course.createdAt,
            courseUpdated: course.updatedAt,
          },
          timestamp: new Date().toISOString(),
        },
        meta: {
          requestId: `course_edit_req_${Date.now()}`,
          apiVersion: "1.0.0",
          courseId: courseId,
        },
      });
    } catch (error) {
      console.error("Get Course Edit Form API error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch course edit data",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  },

  createCourse: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      // Check if it's an API request
      if (
        req.headers["x-requested-with"] === "XMLHttpRequest" ||
        req.headers.accept?.includes("application/json")
      ) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized access",
        });
      }
      return res.redirect("/login");
    }

    const {
      title,
      description,
      category,
      price,
      instructorId,
      status,
      featured,
    } = req.body;
    const isApiRequest =
      req.headers["x-requested-with"] === "XMLHttpRequest" ||
      req.headers.accept?.includes("application/json");

    try {
      if (!title || !description || !category) {
        const errorMessage = "Please fill in all required fields";
        if (isApiRequest) {
          return res.status(400).json({
            success: false,
            message: errorMessage,
          });
        }
        req.flash("error_msg", errorMessage);
        return res.redirect("/admin/courses/new");
      }

      let instructor = null;
      if (instructorId && AdminController.isValidObjectId(instructorId)) {
        instructor = await User.findById(instructorId);
      }
      // Use instructor's name or username, provide clearer fallbacks
      const instructorName = instructor
        ? instructor.name || instructor.username || "Instructor Name Missing"
        : "Unknown Instructor";

      const courseData = {
        title: title.trim(),
        description: description.trim(),
        category,
        price: parseFloat(price) || 0,
        instructorId: instructor ? instructor._id : null, // Store the actual ID found, or null
        instructor: instructorName, // Store the fetched name
        thumbnail: req.file
          ? `/uploads/${req.file.filename}`
          : "/img/placeholder.svg",
        // Add language if it's part of the form
        language: req.body.language || null,
        status: status || "draft", // Use provided status or default
        featured: featured === "true" || featured === true || featured === "on", // Handle different boolean formats
        createdAt: new Date(),
        updatedAt: new Date(),
        modules: [], // Initialize modules
        rating: 0, // Initialize rating
        students: 0, // Initialize students count (though calculated dynamically elsewhere)
      };

      const newCourse = await Course.createCourse(courseData);

      // Send JSON response with headers that can be seen in network tab
      if (isApiRequest) {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("X-Course-ID", newCourse._id.toString());
        res.setHeader("X-Course-Title", newCourse.title);
        res.setHeader("X-Course-Status", newCourse.status);
        res.setHeader("X-Response-Time", new Date().toISOString());

        return res.status(201).json({
          success: true,
          message: "Course created successfully",
          data: {
            course: {
              ...(newCourse.toObject ? newCourse.toObject() : newCourse),
              id: newCourse._id,
            },
            courseId: newCourse._id,
            redirectUrl: `/admin/courses/${newCourse._id}`,
            metadata: {
              instructor: instructorName,
              hasImage: !!req.file,
              isFeatured: courseData.featured,
              createdAt: courseData.createdAt,
            },
            timestamp: new Date().toISOString(),
          },
          meta: {
            requestId: `create_course_req_${Date.now()}`,
            apiVersion: "1.0.0",
            courseId: newCourse._id,
          },
        });
      }

      // Traditional redirect for non-API requests
      req.flash("success_msg", "Course created successfully");
      res.redirect(`/admin/courses/${newCourse._id}`);
    } catch (error) {
      console.error("Create Course error:", error);
      const errorMessage = error.message || "Error creating course";

      if (isApiRequest) {
        return res.status(500).json({
          success: false,
          message: errorMessage,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      req.flash("error_msg", errorMessage);
      res.redirect("/admin/courses/new");
    }
  },

  updateCourse: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const courseId = req.params.id;
    const {
      title,
      description,
      category,
      price,
      status,
      featured,
      instructorId,
    } = req.body;

    if (!AdminController.isValidObjectId(courseId)) {
      req.flash("error_msg", "Invalid Course ID format.");
      return res.redirect("/admin/courses");
    }

    try {
      const course = await Course.getCourseById(courseId);
      if (!course) {
        req.flash("error_msg", "Course not found");
        return res.redirect("/admin/courses");
      }

      let instructorName = course.instructor; // Start with existing name
      let finalInstructorId = course.instructorId; // Start with existing ID

      // Check if instructorId is provided and different from the current one
      if (instructorId && instructorId !== course.instructorId?.toString()) {
        if (AdminController.isValidObjectId(instructorId)) {
          const instructor = await User.findById(instructorId);
          if (instructor) {
            instructorName =
              instructor.name ||
              instructor.username ||
              "Instructor Name Missing"; // Get name from fetched user
            finalInstructorId = instructor._id; // Update the ID to be saved
          } else {
            // Instructor ID provided but not found
            req.flash(
              "error_msg",
              "Selected instructor not found. Keeping original instructor."
            );
            // Keep original instructorName and finalInstructorId by not changing them here
          }
        } else {
          req.flash("error_msg", "Invalid instructor ID format provided.");
          return res.redirect(`/admin/courses/${courseId}/edit`);
        }
      } else if (!instructorId && course.instructorId) {
        // If instructorId is cleared in the form, remove instructor info
        instructorName = "Unknown Instructor";
        finalInstructorId = null;
      }

      const courseData = {
        title,
        description,
        category,
        price: parseFloat(price) || 0,
        status: status || "draft",
        featured: featured === "on",
        instructorId: finalInstructorId, // Use the determined ID (could be null)
        instructor: instructorName, // Use the determined name
        language: req.body.language || course.language, // Update language if provided
        updatedAt: new Date(), // Update the timestamp
      };

      if (req.file) {
        courseData.thumbnail = `/uploads/${req.file.filename}`;
      }

      await Course.updateCourse(courseId, courseData);
      req.flash("success_msg", "Course updated successfully");
      res.redirect(`/admin/courses/${courseId}`);
    } catch (error) {
      console.error("Admin Update Course error:", error);
      req.flash("error_msg", error.message || "Error updating course.");
      res.redirect(`/admin/courses/${courseId}/edit`);
    }
  },

  updateCourseStatus: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const courseId = req.params.id;
    const { status } = req.body;

    try {
      const course = await Course.getCourseById(courseId);
      if (!course) {
        return res
          .status(404)
          .json({ success: false, message: "Course not found" });
      }

      const courseData = {
        ...course,
        status: status,
        updatedAt: new Date(),
      };

      await Course.updateCourse(courseId, courseData);

      return res.json({ success: true, message: "Course status updated" });
    } catch (error) {
      console.error("Update Course Status error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Error updating course status",
      });
    }
  },

  updateCourseFeatured: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const courseId = req.params.id;
    const { featured } = req.body;

    try {
      const course = await Course.getCourseById(courseId);
      if (!course) {
        return res
          .status(404)
          .json({ success: false, message: "Course not found" });
      }

      await Course.markAsFeatured(
        courseId,
        featured === "true" || featured === true
      );

      return res.json({
        success: true,
        message: "Course featured status updated",
      });
    } catch (error) {
      console.error("Update Course Featured error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Error updating course featured status",
      });
    }
  },

  deleteCourse: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const courseId = req.params.id;

    try {
      const deleted = await Course.deleteCourse(courseId);

      if (!deleted) {
        req.flash("error_msg", "Course not found or could not be deleted");
        return res.redirect("/admin/courses");
      }

      req.flash("success_msg", "Course deleted successfully");
      res.redirect("/admin/courses");
    } catch (error) {
      console.error("Admin Delete Course error:", error);
      req.flash("error_msg", error.message || "Error deleting course.");
      res.redirect("/admin/courses");
    }
  },

  getOrders: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }
    try {
      const orders = await Order.getAllOrders();

      const enhancedOrdersPromises = orders.map(async (order) => {
        let user = null;
        let course = null;

        if (order.userId && AdminController.isValidObjectId(order.userId)) {
          user = await User.findById(order.userId);
        }

        if (order.courseId) {
          course = await Course.getCourseById(order.courseId);
        }

        return {
          ...order,
          userName: user ? user.name : "Unknown User",
          courseTitle: course ? course.title : "Unknown Course",
        };
      });

      const enhancedOrders = await Promise.all(enhancedOrdersPromises);

      enhancedOrders.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      res.render("admin/orders", { orders: enhancedOrders });
    } catch (error) {
      console.error("Admin Get Orders error:", error);
      req.flash("error_msg", "Could not load orders.");
      res.redirect("/admin/dashboard");
    }
  },

  updateOrderStatus: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const orderId = req.params.id;
    const { status } = req.body;

    try {
      await Order.updateOrderStatus(orderId, status);

      return res.json({ success: true, message: "Order status updated" });
    } catch (error) {
      console.error("Update Order Status error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Error updating order status",
      });
    }
  },

  getRevenue: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }
    try {
      // Just render the page - data will be loaded via fetch API
      res.render("admin/revenue", {
        totalRevenue: "0.00", // Placeholder, will be loaded via API
        monthlyRevenue: [], // Empty array, will be loaded via API
        success_msg: req.flash("success_msg"),
        error_msg: req.flash("error_msg"),
      });
    } catch (error) {
      console.error("Admin Get Revenue page error:", error);
      req.flash("error_msg", "Could not load revenue page.");
      res.redirect("/admin/dashboard");
    }
  },

  // API endpoint to fetch revenue data
  getRevenueAPI: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    try {
      const totalRevenue = await Order.getTotalRevenue();
      const monthlyRevenueData = await Order.getRevenueByMonth();
      const allOrders = await Order.getAllOrders();

      // Calculate additional revenue statistics
      const completedOrders = allOrders.filter(
        (order) => order.status === "completed"
      );
      const pendingOrders = allOrders.filter(
        (order) => order.status === "pending"
      );
      const averageOrderValue =
        completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

      // Calculate revenue growth (comparing last month with previous month)
      let revenueGrowth = 0;
      if (monthlyRevenueData.length >= 2) {
        const lastMonth = monthlyRevenueData[monthlyRevenueData.length - 1];
        const previousMonth = monthlyRevenueData[monthlyRevenueData.length - 2];
        if (previousMonth.revenue > 0) {
          revenueGrowth =
            ((lastMonth.revenue - previousMonth.revenue) /
              previousMonth.revenue) *
            100;
        }
      }

      // Get top revenue generating months
      const sortedMonths = [...monthlyRevenueData].sort(
        (a, b) => b.revenue - a.revenue
      );
      const topMonth = sortedMonths[0] || { month: "N/A", revenue: 0 };

      // Send JSON response with headers that can be seen in network tab
      res.setHeader("Content-Type", "application/json");
      res.setHeader("X-Total-Revenue", totalRevenue.toFixed(2));
      res.setHeader("X-Total-Orders", allOrders.length.toString());
      res.setHeader("X-Completed-Orders", completedOrders.length.toString());
      res.setHeader("X-Pending-Orders", pendingOrders.length.toString());
      res.setHeader(
        "X-Monthly-Data-Points",
        monthlyRevenueData.length.toString()
      );
      res.setHeader("X-Revenue-Growth", revenueGrowth.toFixed(2) + "%");
      res.setHeader("X-Response-Time", new Date().toISOString());

      res.status(200).json({
        success: true,
        message: "Revenue data fetched successfully",
        data: {
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          monthlyRevenue: monthlyRevenueData,
          statistics: {
            totalOrders: allOrders.length,
            completedOrders: completedOrders.length,
            pendingOrders: pendingOrders.length,
            averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
            revenueGrowth: parseFloat(revenueGrowth.toFixed(2)),
            topMonth: topMonth,
          },
          metadata: {
            dataPoints: monthlyRevenueData.length,
            hasRevenueData: monthlyRevenueData.length > 0,
            lastUpdated: new Date().toISOString(),
            currency: "INR",
          },
          timestamp: new Date().toISOString(),
        },
        meta: {
          requestId: `revenue_req_${Date.now()}`,
          apiVersion: "1.0.0",
        },
      });
    } catch (error) {
      console.error("Get Revenue API error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch revenue data",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  },

  getUserDetails: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    try {
      const userId = req.params.id;

      if (!AdminController.isValidObjectId(userId)) {
        req.flash("error_msg", "Invalid User ID format.");
        return res.redirect("/admin/users");
      }

      // Just render the page - data will be loaded via fetch API
      res.render("admin/user-details", {
        userId: userId,
        user: {
          _id: userId,
          username: "Loading...",
          email: "Loading...",
          role: "loading",
          joinDate: new Date(),
        },
        enrolledCourses: [],
        instructorCourses: [],
        orders: [],
        adminCount: 0,
        success_msg: req.flash("success_msg"),
        error_msg: req.flash("error_msg"),
      });
    } catch (error) {
      console.error("Get User Details page error:", error);
      req.flash("error_msg", "Could not load user details page.");
      res.redirect("/admin/users");
    }
  },

  // API endpoint to fetch user details
  getUserDetailsAPI: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    try {
      const userId = req.params.id;

      if (!AdminController.isValidObjectId(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid User ID format",
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const adminCount = await User.countDocuments({ role: "admin" });

      let enrolledCourses = [];
      let instructorCourses = [];
      let orders = [];

      if (
        user.role === "student" &&
        user.enrolledCourses &&
        user.enrolledCourses.length > 0
      ) {
        const coursesPromises = user.enrolledCourses.map(async (courseId) => {
          if (!AdminController.isValidObjectId(courseId.toString())) {
            return null;
          }

          const course = await Course.getCourseById(courseId.toString());
          if (!course) return null;

          let progress = 0;
          try {
            progress = Math.floor(Math.random() * 100);
          } catch (err) {
            console.error("Could not get progress:", err);
          }

          return {
            ...course,
            id: courseId,
            progress: progress,
          };
        });

        enrolledCourses = (await Promise.all(coursesPromises)).filter(
          (course) => course !== null
        );
      }

      if (user.role === "instructor") {
        let courses = await Course.getAllCourses();

        instructorCourses = courses
          .filter(
            (course) =>
              course.instructorId &&
              course.instructorId.toString() === userId.toString()
          )
          .map((course) => {
            return {
              ...course,
              id: course._id,
              students: 0,
              rating: course.rating || "N/A",
            };
          });

        for (let i = 0; i < instructorCourses.length; i++) {
          try {
            const studentCount = await User.countDocuments({
              enrolledCourses: instructorCourses[i].id,
            });
            instructorCourses[i].students = studentCount;
          } catch (err) {
            console.error("Error getting student count:", err);
          }
        }
      }

      orders = await Order.getAllOrders();
      orders = orders
        .filter(
          (order) =>
            order.userId && order.userId.toString() === userId.toString()
        )
        .map(async (order) => {
          let course = null;
          if (order.courseId) {
            course = await Course.getCourseById(order.courseId);
          }

          return {
            ...order,
            id: order._id,
            courseTitle: course ? course.title : "Unknown Course",
          };
        });

      orders = await Promise.all(orders);

      // Send JSON response with headers that can be seen in network tab
      res.setHeader("Content-Type", "application/json");
      res.setHeader("X-User-ID", userId);
      res.setHeader("X-User-Role", user.role || "unknown");
      res.setHeader("X-Enrolled-Courses", enrolledCourses.length.toString());
      res.setHeader(
        "X-Instructor-Courses",
        instructorCourses.length.toString()
      );
      res.setHeader("X-Orders-Count", orders.length.toString());
      res.setHeader("X-Response-Time", new Date().toISOString());

      res.status(200).json({
        success: true,
        message: "User details fetched successfully",
        data: {
          user: {
            ...(user.toObject ? user.toObject() : user),
            id: user._id,
          },
          enrolledCourses: enrolledCourses,
          instructorCourses: instructorCourses,
          orders: orders,
          adminCount: adminCount,
          metadata: {
            totalEnrolledCourses: enrolledCourses.length,
            totalInstructorCourses: instructorCourses.length,
            totalOrders: orders.length,
            canDelete:
              user.role !== "admin" ||
              (user.role === "admin" && adminCount > 1),
            accountAge: user.joinDate
              ? Math.floor(
                  (new Date() - new Date(user.joinDate)) / (1000 * 60 * 60 * 24)
                )
              : 0,
          },
          timestamp: new Date().toISOString(),
        },
        meta: {
          requestId: `user_details_req_${Date.now()}`,
          apiVersion: "1.0.0",
          userId: userId,
        },
      });
    } catch (error) {
      console.error("Get User Details API error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch user details",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  },

  getCourseRatings: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    try {
      const courseId = req.params.id;

      const course = await Course.getCourseById(courseId);

      if (!course) {
        req.flash("error_msg", "Course not found");
        return res.redirect("/admin/courses");
      }

      let instructor = null;
      if (course.instructorId) {
        instructor = await User.findById(course.instructorId);
      }

      const RatingModel = require("../models/rating.model");

      const ratings = await RatingModel.getCourseRatings(courseId);

      const ratingStats = {
        average: course.rating || 0,
        total: ratings.length,
        distribution: {
          5: ratings.filter((r) => Math.floor(r.rating) === 5).length,
          4: ratings.filter((r) => Math.floor(r.rating) === 4).length,
          3: ratings.filter((r) => Math.floor(r.rating) === 3).length,
          2: ratings.filter((r) => Math.floor(r.rating) === 2).length,
          1: ratings.filter((r) => Math.floor(r.rating) === 1).length,
        },
      };

      ratingStats.percentages = {};
      for (const stars in ratingStats.distribution) {
        ratingStats.percentages[stars] =
          ratings.length > 0
            ? (ratingStats.distribution[stars] / ratings.length) * 100
            : 0;
      }

      res.render("admin/course-ratings", {
        course,
        instructor: instructor ? instructor : { name: "Unknown Instructor" },
        ratings,
        ratingStats,
        success_msg: req.flash("success_msg"),
        error_msg: req.flash("error_msg"),
      });
    } catch (error) {
      console.error("Admin Course Ratings error:", error);
      req.flash("error_msg", "Failed to retrieve course ratings");
      res.redirect("/admin/courses");
    }
  },

  // Admin Profile Methods
  getAdminProfile: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    try {
      // Just render the page - data will be loaded via fetch API
      res.render("admin/profile", {
        user: {
          _id: req.session.user.id,
          username: "Loading...",
          email: "Loading...",
          role: "admin",
          createdAt: new Date(),
        },
        success_msg: req.flash("success_msg"),
        error_msg: req.flash("error_msg"),
      });
    } catch (error) {
      console.error("Get Admin Profile page error:", error);
      req.flash("error_msg", "Could not load profile page.");
      res.redirect("/admin/dashboard");
    }
  },

  // API endpoint to fetch admin profile data
  getAdminProfileAPI: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    try {
      const userId = req.session.user.id;

      if (!AdminController.isValidObjectId(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid User ID format",
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const adminCount = await User.countDocuments({ role: "admin" });
      const totalUsers = await User.countDocuments();
      const totalCourses = await Course.getAllCourses();
      const totalOrders = await Order.getAllOrders();

      // Calculate admin statistics
      const stats = {
        totalUsers: totalUsers,
        totalCourses: totalCourses.length,
        totalOrders: totalOrders.length,
        totalRevenue: totalOrders.reduce(
          (sum, order) => sum + (order.amount || 0),
          0
        ),
        adminCount: adminCount,
        accountAge: user.createdAt
          ? Math.floor(
              (new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)
            )
          : 0,
      };

      // Send JSON response with headers that can be seen in network tab
      res.setHeader("Content-Type", "application/json");
      res.setHeader("X-Admin-ID", userId);
      res.setHeader("X-Admin-Name", user.username || user.name || "Unknown");
      res.setHeader("X-Total-Users", stats.totalUsers.toString());
      res.setHeader("X-Total-Courses", stats.totalCourses.toString());
      res.setHeader("X-Total-Orders", stats.totalOrders.toString());
      res.setHeader("X-Admin-Count", stats.adminCount.toString());
      res.setHeader("X-Response-Time", new Date().toISOString());

      // Calculate profile completion
      const calculateProfileCompletion = (user) => {
        let completion = 0;
        const fields = ["username", "name", "email", "bio"];
        fields.forEach((field) => {
          if (user[field] && user[field].trim()) completion += 25;
        });
        return Math.min(completion, 100);
      };

      res.status(200).json({
        success: true,
        message: "Admin profile data fetched successfully",
        data: {
          user: {
            ...(user.toObject ? user.toObject() : user),
            id: user._id,
          },
          statistics: stats,
          metadata: {
            isLastAdmin: adminCount === 1,
            canChangeRole: false, // Admins typically can't change their own role
            lastLogin: user.lastLogin || user.createdAt,
            profileCompletion: calculateProfileCompletion(user),
          },
          timestamp: new Date().toISOString(),
        },
        meta: {
          requestId: `admin_profile_req_${Date.now()}`,
          apiVersion: "1.0.0",
          userId: userId,
        },
      });
    } catch (error) {
      console.error("Get Admin Profile API error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch admin profile data",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  },

  // Update admin profile
  updateAdminProfile: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    try {
      const userId = req.session.user.id;
      const { name, email, currentPassword, newPassword, bio } = req.body;

      if (!AdminController.isValidObjectId(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid User ID format",
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Prepare update object
      const updates = {};

      // Validate and update name
      if (name && name.trim()) {
        if (!/^[a-zA-Z\s'-]+$/.test(name.trim())) {
          return res.status(400).json({
            success: false,
            message:
              "Name can only contain letters, spaces, apostrophes, and hyphens",
          });
        }
        updates.username = name.trim();
        updates.name = name.trim();
      }

      // Validate and update email
      if (email && email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          return res.status(400).json({
            success: false,
            message: "Please enter a valid email address",
          });
        }

        // Check if email is already taken by another user
        const existingUser = await User.findOne({
          email: email.trim(),
          _id: { $ne: userId },
        });

        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: "Email is already taken by another user",
          });
        }

        updates.email = email.trim();
      }

      // Update bio if provided
      if (bio !== undefined) {
        updates.bio = bio.trim();
      }

      // Handle password update
      if (currentPassword && newPassword) {
        // Verify current password
        const isValidPassword = await bcrypt.compare(
          currentPassword,
          user.password
        );
        if (!isValidPassword) {
          return res.status(400).json({
            success: false,
            message: "Current password is incorrect",
          });
        }

        // Validate new password
        if (newPassword.length < 6) {
          return res.status(400).json({
            success: false,
            message: "New password must be at least 6 characters long",
          });
        }

        // Hash new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        updates.password = hashedPassword;
      }

      // Update user
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true, runValidators: true }
      );

      // Update session data
      req.session.user.username = updatedUser.username || updatedUser.name;
      req.session.user.email = updatedUser.email;

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: {
          user: {
            ...(updatedUser.toObject ? updatedUser.toObject() : updatedUser),
            id: updatedUser._id,
          },
          passwordChanged: !!(currentPassword && newPassword),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Update Admin Profile error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update profile",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  },
};

module.exports = AdminController;
