const User = require("../models/User");
const Course = require("../models/course.model");
const Order = require("../models/order.model");

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
          let instructor = null;
          if (
            course.instructorId &&
            AdminController.isValidObjectId(course.instructorId)
          ) {
            instructor = await User.findById(course.instructorId);
          }
          return {
            ...course,
            instructorId: instructor ? { name: instructor.name } : null,
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
      const recentCourses = recentCoursesWithInstructors.map((course) => ({
        ...course,
        instructor: course.instructorId
          ? course.instructorId.name
          : "Unknown Instructor",
      }));

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

      res.render("admin/dashboard", {
        stats,
        recentUsers,
        recentCourses,
      });
    } catch (error) {
      console.error("Admin Dashboard error:", error);
      req.flash("error_msg", "Could not load dashboard.");
      res.redirect("/");
    }
  },

  getUsers: async (req, res) => {
    // Add async
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }
    try {
      // Add try-catch
      const users = await User.find(); // Get all users
      res.render("admin/users", { users });
    } catch (error) {
      console.error("Get Users error:", error);
      req.flash("error_msg", "Could not load users.");
      res.redirect("/admin/dashboard");
    }
  },

  getEditUserForm: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    try {
      const userId = req.params.id;
      const user = await User.findById(userId);

      if (!user) {
        req.flash("error_msg", "User not found");
        return res.redirect("/admin/users");
      }

      res.render("admin/user-edit", { user });
    } catch (error) {
      console.error("Get Edit User Form error:", error);
      req.flash("error_msg", "Could not load user data.");
      res.redirect("/admin/users");
    }
  },

  updateUser: async (req, res) => {
    // Add async
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const userId = req.params.id;
    const { name, email, role } = req.body;

    try {
      // Add try-catch
      const user = await User.findById(userId); // Find user first
      if (!user) {
        req.flash("error_msg", "User not found");
        return res.redirect("/admin/users");
      }

      // Prevent changing own role or another admin's role (example)
      if (
        user.role === "admin" &&
        (role !== "admin" || user._id.equals(req.session.user.id))
      ) {
        if (user._id.equals(req.session.user.id) && role !== "admin") {
          req.flash("error_msg", "Cannot change your own role.");
        } else if (role !== "admin") {
          // Add check to ensure there's at least one admin left if needed
          const adminCount = await User.countDocuments({ role: "admin" });
          if (adminCount <= 1) {
            req.flash("error_msg", "Cannot remove the last admin.");
            return res.redirect("/admin/users");
          }
          req.flash("error_msg", "Cannot change the role of an admin user.");
        } else {
          // Allow updating other fields for self or other admins
        }
        // If only role change is disallowed for admins, adjust logic:
        // if (user.role === "admin" && role !== "admin") { ... }

        // For now, let's just update non-role fields if it's an admin
        if (user.role === "admin" && role !== "admin") {
          req.flash("error_msg", "Admin role cannot be changed.");
          // Only update name and email if they changed
          await User.findByIdAndUpdate(userId, { name, email });
          req.flash("success_msg", "Admin user info (excluding role) updated.");
          return res.redirect("/admin/users");
        }
      }

      // Update user
      await User.findByIdAndUpdate(
        userId,
        { name, email, role },
        { new: true }
      );
      req.flash("success_msg", "User updated successfully");
      res.redirect("/admin/users");
    } catch (error) {
      console.error("Update User error:", error);
      req.flash("error_msg", error.message || "Error updating user.");
      res.redirect("/admin/users");
    }
  },

  deleteUser: async (req, res) => {
    // Add async
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const userId = req.params.id;

    try {
      // Add try-catch
      const user = await User.findById(userId); // Find user first

      if (!user) {
        req.flash("error_msg", "User not found");
        return res.redirect("/admin/users");
      }

      // Prevent deleting self or other admins
      if (user._id.equals(req.session.user.id)) {
        req.flash("error_msg", "Cannot delete yourself.");
        return res.redirect("/admin/users");
      }
      if (user.role === "admin") {
        // Ensure not deleting the last admin
        const adminCount = await User.countDocuments({ role: "admin" });
        if (adminCount <= 1) {
          req.flash("error_msg", "Cannot delete the last admin user.");
          return res.redirect("/admin/users");
        }
        req.flash("error_msg", "Cannot delete an admin user.");
        return res.redirect("/admin/users");
      }

      // Delete user
      await User.findByIdAndDelete(userId);
      // Optional: Clean up related data (e.g., progress, orders?) - depends on requirements

      req.flash("success_msg", "User deleted successfully");
      res.redirect("/admin/users");
    } catch (error) {
      console.error("Delete User error:", error);
      req.flash("error_msg", error.message || "Error deleting user.");
      res.redirect("/admin/users");
    }
  },

  getCourses: async (req, res) => {
    // Add async
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const { search = "", category = "all", sort = "newest" } = req.query;
    let query = {};
    let sortOption = { createdAt: -1 };

    // Build query
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        // Add description/instructor search if needed (instructor requires population first or separate query)
      ];
    }
    if (category !== "all") {
      query.category = category;
    }

    // Build sort option
    switch (sort) {
      case "oldest":
        sortOption = { createdAt: 1 };
        break;
      case "title-asc":
        sortOption = { title: 1 };
        break;
      case "title-desc":
        sortOption = { title: -1 };
        break;
      case "price-low":
        sortOption = { price: 1 };
        break;
      case "price-high":
        sortOption = { price: -1 };
        break;
    }

    try {
      // Add try-catch
      let courses = await Course.getAllCourses();

      // Since getAllCourses doesn't support population, we need to fetch instructor data separately
      // Enhance with student count (consider aggregation for performance)
      const enhancedCoursesPromises = courses.map(async (course) => {
        let instructor = null;
        if (
          course.instructorId &&
          AdminController.isValidObjectId(course.instructorId)
        ) {
          instructor = await User.findById(course.instructorId);
        }
        const studentCount = await User.countDocuments({
          enrolledCourses: course._id,
        });
        return {
          ...course,
          students: studentCount,
          instructor: instructor ? instructor.name : "Unknown Instructor",
        };
      });
      const enhancedCourses = await Promise.all(enhancedCoursesPromises);

      const categories = await Course.getAllCategories();

      res.render("admin/courses", {
        courses: enhancedCourses,
        categories,
        search,
        category,
        sort,
      });
    } catch (error) {
      console.error("Admin Get Courses error:", error);
      req.flash("error_msg", "Could not load courses.");
      res.redirect("/admin/dashboard");
    }
  },

  getNewCourseForm: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    try {
      // Get instructors for dropdown
      const instructors = await User.find({ role: "instructor" }, "name email");

      res.render("admin/edit-course", {
        course: null, // No course data for new course form
        instructors,
        formAction: "/admin/courses", // POST to create new course
        formTitle: "Create New Course",
      });
    } catch (error) {
      console.error("Get New Course Form error:", error);
      req.flash("error_msg", "Could not load course form.");
      res.redirect("/admin/courses");
    }
  },

  getCourseDetails: async (req, res) => {
    // Add async
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

      // Find the instructor separately since we can't use populate
      let instructor = null;
      if (
        course.instructorId &&
        AdminController.isValidObjectId(course.instructorId)
      ) {
        instructor = await User.findById(course.instructorId);
      }

      // Ensure instructor is never undefined, provide default values if instructor not found
      // Make sure name is always a string to prevent TypeError with .charAt(0)
      instructor = {
        name: instructor?.name || course.instructor || "Unknown Instructor",
        email: instructor?.email || "N/A",
        id: instructor?._id || null,
      };

      // Find enrolled students
      const enrolledStudents = await User.find(
        { enrolledCourses: courseId },
        "name email"
      );

      res.render("admin/course-details", {
        course: {
          ...course,
          instructor: instructor.name,
          students: enrolledStudents.length,
          rating: course.rating || "N/A",
        },
        instructor: instructor,
        enrolledStudents,
      });
    } catch (error) {
      console.error("Admin Get Course Details error:", error);
      req.flash("error_msg", "Could not load course details.");
      res.redirect("/admin/courses");
    }
  },

  getEditCourseForm: async (req, res) => {
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

      // Get instructors for dropdown
      const instructors = await User.find({ role: "instructor" }, "name email");

      res.render("admin/edit-course", {
        course,
        instructors,
        formAction: `/admin/courses/${courseId}?_method=PUT`, // PUT to update existing course
        formTitle: "Edit Course",
      });
    } catch (error) {
      console.error("Get Edit Course Form error:", error);
      req.flash("error_msg", "Could not load course data.");
      res.redirect("/admin/courses");
    }
  },

  createCourse: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    // Assuming Multer middleware runs before this to handle req.file
    const { title, description, category, price, instructorId } = req.body;

    try {
      // Basic validation
      if (!title || !description || !category) {
        req.flash("error_msg", "Please fill in all required fields");
        return res.redirect("/admin/courses/new");
      }

      let instructor = null;
      if (instructorId && AdminController.isValidObjectId(instructorId)) {
        instructor = await User.findById(instructorId);
      }

      const courseData = {
        title,
        description,
        category,
        price: parseFloat(price) || 0,
        instructorId: instructorId || req.session.user.id, // Default to current user if no instructor selected
        instructor: instructor ? instructor.name : "Unknown Instructor",
        thumbnail: req.file
          ? `/uploads/${req.file.filename}`
          : "/img/placeholder.svg",
      };

      const newCourse = await Course.createCourse(courseData);

      req.flash("success_msg", "Course created successfully");
      res.redirect(`/admin/courses/${newCourse._id}`);
    } catch (error) {
      console.error("Create Course error:", error);
      req.flash("error_msg", error.message || "Error creating course");
      res.redirect("/admin/courses/new");
    }
  },

  updateCourse: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const courseId = req.params.id;
    // Assuming Multer middleware runs before this to handle req.file
    const {
      title,
      description,
      category,
      price,
      status,
      featured,
      instructorId,
    } = req.body;

    // Validate courseId
    if (!AdminController.isValidObjectId(courseId)) {
      req.flash("error_msg", "Invalid Course ID format.");
      return res.redirect("/admin/courses"); // Redirect to courses list or appropriate page
    }

    try {
      const course = await Course.getCourseById(courseId);
      if (!course) {
        req.flash("error_msg", "Course not found");
        return res.redirect("/admin/courses");
      }

      // Get instructor name if instructorId is provided
      let instructorName = course.instructor;
      if (instructorId && instructorId !== course.instructorId) {
        // Add validation for ObjectId
        if (AdminController.isValidObjectId(instructorId)) {
          const instructor = await User.findById(instructorId);
          instructorName = instructor ? instructor.name : "Unknown Instructor";
        } else {
          req.flash("error_msg", "Invalid instructor ID format");
          return res.redirect(`/admin/courses/${courseId}/edit`);
        }
      }

      const courseData = {
        title,
        description,
        category,
        price: parseFloat(price) || 0,
        status: status || "draft",
        featured: featured === "on", // Checkbox value
        instructorId: instructorId || course.instructorId,
        instructor: instructorName,
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

      // Create updated course data
      const courseData = {
        ...course,
        status: status,
        updatedAt: new Date(),
      };

      // Update the course
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
      // Get the course with the custom method
      const course = await Course.getCourseById(courseId);
      if (!course) {
        return res
          .status(404)
          .json({ success: false, message: "Course not found" });
      }

      // Use the markAsFeatured method from your custom Course model
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
      // Use the deleteCourse method from your custom Course model
      const deleted = await Course.deleteCourse(courseId);

      if (!deleted) {
        req.flash("error_msg", "Course not found or could not be deleted");
        return res.redirect("/admin/courses");
      }

      // Optional: Clean up related data
      // - Remove from user enrolledCourses arrays
      // - Delete related Progress records
      // - Delete related Orders (or mark as cancelled?)
      // - Delete thumbnail file from server

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
      // Use the custom getAllOrders method
      const orders = await Order.getAllOrders();

      // Since we don't have populate for the custom model, we need to fetch user and course details separately
      const enhancedOrdersPromises = orders.map(async (order) => {
        let user = null;
        let course = null;

        // Validate userId is a valid ObjectId before querying
        if (order.userId && AdminController.isValidObjectId(order.userId)) {
          user = await User.findById(order.userId);
        }

        // Get course data using our custom model method
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

      // Sort by creation date (most recent first)
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
      // Use the custom updateOrderStatus method from your Order model
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
      // Use the custom Order model methods
      const totalRevenue = await Order.getTotalRevenue();
      const monthlyRevenueData = await Order.getRevenueByMonth();

      res.render("admin/revenue", {
        totalRevenue: totalRevenue.toFixed(2),
        monthlyRevenue: monthlyRevenueData,
      });
    } catch (error) {
      console.error("Admin Get Revenue error:", error);
      req.flash("error_msg", "Could not load revenue data.");
      res.redirect("/admin/dashboard");
    }
  },
};

module.exports = AdminController;
