const UserModel = require("../models/user.model");
const CourseModel = require("../models/course.model");
const OrderModel = require("../models/order.model");

// Admin controller
const AdminController = {
  // Get admin dashboard
  getAdminDashboard: (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    // Calculate stats
    const totalUsers = UserModel.getUserCount();
    const totalCourses = CourseModel.getCourseCount();
    const totalInstructors = UserModel.getUsersByRole("instructor").length;
    const totalRevenue = OrderModel.getTotalRevenue();

    // Get recent users
    const recentUsers = UserModel.getAllUsers()
      .sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate))
      .slice(0, 5);

    // Get recent courses
    const recentCourses = CourseModel.getAllCourses()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    res.render("admin/dashboard", {
      stats: {
        totalUsers,
        totalCourses,
        totalInstructors,
        totalRevenue,
      },
      recentUsers,
      recentCourses,
    });
  },

  // Get user management page
  getUserManagement: (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const { search, role, sort } = req.query;
    let users = UserModel.getAllUsers();

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(
        (user) =>
          user.name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower)
      );
    }

    // Apply role filter
    if (role && role !== "all") {
      users = users.filter((user) => user.role === role);
    }

    // Apply sorting
    if (sort) {
      switch (sort) {
        case "name-asc":
          users.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case "name-desc":
          users.sort((a, b) => b.name.localeCompare(a.name));
          break;
        case "newest":
          users.sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate));
          break;
        case "oldest":
          users.sort((a, b) => new Date(a.joinDate) - new Date(b.joinDate));
          break;
      }
    } else {
      // Default sort by newest
      users.sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate));
    }

    res.render("admin/users", {
      users,
      search: search || "",
      role: role || "all",
      sort: sort || "newest",
    });
  },

  // Get user details
// Get user details
getUserDetails: (req, res) => {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.redirect("/login");
  }

  const userId = req.params.id;
  const user = UserModel.getUserById(userId);

  if (!user) {
    req.flash("error_msg", "User not found");
    return res.redirect("/admin/users");
  }

  // Get user's enrolled courses
  const enrolledCourses = UserModel.getUserEnrolledCourses(userId);

  // Get user's orders
  const orders = OrderModel.getOrdersByUser(userId).map((order) => {
    const course = CourseModel.getCourseById(order.courseId);
    return {
      ...order,
      courseTitle: course ? course.title : "Unknown Course",
    };
  });

  // Always define instructorCourses even if it's an empty array
  let instructorCourses = [];
  if (user.role === "instructor") {
    // Adjust the filtering logic according to how courses are linked to instructors.
    instructorCourses = CourseModel.getAllCourses().filter(
      (course) => course.instructorId === userId
    );
  }

  res.render("admin/user-details", {
    user,
    enrolledCourses,
    instructorCourses, // Make sure this is included!
    orders,
    adminCount: 2,
  });
},

  // Update user
  updateUser: (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const userId = req.params.id;
    const { name, email, role } = req.body;

    try {
      UserModel.updateUser(userId, { name, email, role });

      req.flash("success_msg", "User updated successfully");
      res.redirect(`/admin/users/${userId}`);
    } catch (error) {
      req.flash("error_msg", error.message);
      res.redirect(`/admin/users/${userId}`);
    }
  },

  // Delete user
  deleteUser: (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const userId = req.params.id;

    try {
      UserModel.deleteUser(userId);

      req.flash("success_msg", "User deleted successfully");
      res.redirect("/admin/users");
    } catch (error) {
      req.flash("error_msg", error.message);
      res.redirect("/admin/users");
    }
  },

  // Get course management page
  getCourseManagement: (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const { search, category, sort } = req.query;
    let courses = CourseModel.getAllCourses();
    const categories = CourseModel.getAllCategories();

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      courses = courses.filter(
        (course) =>
          course.title.toLowerCase().includes(searchLower) ||
          course.instructor.toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter
    if (category && category !== "all") {
      courses = courses.filter((course) => course.category === category);
    }

    // Apply sorting
    if (sort) {
      switch (sort) {
        case "title-asc":
          courses.sort((a, b) => a.title.localeCompare(b.title));
          break;
        case "title-desc":
          courses.sort((a, b) => b.title.localeCompare(a.title));
          break;
        case "newest":
          courses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          break;
        case "oldest":
          courses.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          break;
      }
    } else {
      // Default sort by newest
      courses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    res.render("admin/courses", {
      courses,
      categories,
      search: search || "",
      category: category || "all",
      sort: sort || "newest",
    });
  },

  // Get course details
  getCourseDetails: (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const courseId = req.params.id;
    const course = CourseModel.getCourseById(courseId);

    if (!course) {
      req.flash("error_msg", "Course not found");
      return res.redirect("/admin/courses");
    }

    // Get instructor
    const instructor = UserModel.getUserById(course.instructorId);

    // Get enrolled students
    const enrolledStudents = UserModel.getAllUsers().filter((user) =>
      user.enrolledCourses.includes(courseId)
    );

    // Get course orders
    const orders = OrderModel.getOrdersByCourse(courseId).map((order) => {
      const user = UserModel.getUserById(order.userId);
      return {
        ...order,
        userName: user ? user.name : "Unknown User",
      };
    });

    res.render("admin/course-details", {
      course,
      instructor,
      enrolledStudents,
      orders,
    });
  },

  // Update course
  updateCourse: (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const courseId = req.params.id;
    const { title, description, category, price, featured } = req.body;

    try {
      CourseModel.updateCourse(courseId, {
        title,
        description,
        category,
        price: Number.parseFloat(price),
      });

      // Update featured status
      if (featured !== undefined) {
        CourseModel.markAsFeatured(courseId, featured === "on");
      }

      req.flash("success_msg", "Course updated successfully");
      res.redirect(`/admin/courses/${courseId}`);
    } catch (error) {
      req.flash("error_msg", error.message);
      res.redirect(`/admin/courses/${courseId}`);
    }
  },

  // Delete course
  deleteCourse: (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const courseId = req.params.id;

    try {
      CourseModel.deleteCourse(courseId);

      req.flash("success_msg", "Course deleted successfully");
      res.redirect("/admin/courses");
    } catch (error) {
      req.flash("error_msg", error.message);
      res.redirect("/admin/courses");
    }
  },

  getRevenueManagement: (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    // Get all orders
    const orders = OrderModel.getAllOrders().filter(
      (order) => order.status === "completed"
    );

    // Calculate total revenue
    const totalRevenue = OrderModel.getTotalRevenue();

    // Get revenue by month
    const revenueByMonth = OrderModel.getRevenueByMonth();

    // Calculate monthly revenue (revenue for the current month)
    const currentMonth = new Date().toLocaleString("default", {
      month: "long",
    });
    const monthlyRevenue =
      revenueByMonth.find((month) => month.month === currentMonth)?.revenue ||
      0;

    // Get recent orders
    const recentOrders = OrderModel.getRecentOrders(10);

    // Calculate revenue by category (example logic - replace with your actual logic)
    const categoryRevenue = [
      { name: "Programming", revenue: 30000 },
      { name: "Design", revenue: 15000 },
      { name: "Business", revenue: 10000 },
      { name: "Marketing", revenue: 5000 },
    ];
    // const categoryRevenue = Object.keys(revenueByCategory).map((category) => ({
    //   name: category,
    //   revenue: revenueByCategory[category],
    // }));

    // Render the EJS template with the data
    res.render("admin/revenue", {
      totalRevenue,
      monthlyRevenue,
      chartData: revenueByMonth,
      recentOrders,
      categoryRevenue,
    });
  },
};

module.exports = AdminController;
