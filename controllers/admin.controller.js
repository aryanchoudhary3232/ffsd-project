const UserModel = require("../models/user.model");
const CourseModel = require("../models/course.model");
const OrderModel = require("../models/order.model");

const AdminController = {
  getAdminDashboard: (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const users = UserModel.getAllUsers();
    const totalUsers = users.length;
    const totalInstructors = users.filter(
      (user) => user.role === "instructor"
    ).length;
    const totalCourses = CourseModel.getAllCourses().length;
    const totalRevenue = OrderModel.getAllOrders()
      .filter((order) => order.status === "completed")
      .reduce((sum, order) => sum + order.amount, 0);

    const recentUsers = users
      .sort((a, b) => (b.joinDate || b.id) - (a.joinDate || a.id))
      .slice(0, 5)
      .map((user) => ({
        ...user,
        joinDate: user.joinDate || new Date().toISOString(),
      }));

    const recentCourses = CourseModel.getAllCourses()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map((course) => ({
        ...course,
        instructor:
          UserModel.getUserById(course.instructorId)?.name ||
          "Unknown Instructor",
      }));

    const totalStudents = users.filter(
      (user) => user.role === "student"
    ).length;
    const totalAdmins = users.filter((user) => user.role === "admin").length;
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
  },

  getUsers: (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const users = UserModel.getAllUsers();
    res.render("admin/users", { users });
  },

  getEditUserForm: (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const userId = req.params.id;
    const user = UserModel.getUserById(userId);

    if (!user) {
      req.flash("error_msg", "User not found");
      return res.redirect("/admin/users");
    }

    res.render("admin/user-form", { user });
  },

  updateUser: (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const userId = req.params.id;
    const { name, email, role } = req.body;

    const user = UserModel.getUserById(userId);
    if (!user) {
      req.flash("error_msg", "User not found");
      return res.redirect("/admin/users");
    }

    if (user.role === "admin" && role !== "admin") {
      req.flash("error_msg", "Cannot change the role of an admin user");
      return res.redirect("/admin/users");
    }

    UserModel.updateUser(userId, { name, email, role });
    req.flash("success_msg", "User updated successfully");
    res.redirect("/admin/users");
  },

  deleteUser: (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const userId = req.params.id;
    const user = UserModel.getUserById(userId);

    if (!user) {
      req.flash("error_msg", "User not found");
      return res.redirect("/admin/users");
    }

    if (user.role === "admin") {
      req.flash("error_msg", "Cannot delete an admin user");
      return res.redirect("/admin/users");
    }

    UserModel.deleteUser(userId);
    req.flash("success_msg", "User deleted successfully");
    res.redirect("/admin/users");
  },

  getCourses: (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const { search = "", category = "all", sort = "newest" } = req.query;

    let courses = CourseModel.getAllCourses();

    const users = UserModel.getAllUsers();
    courses = courses.map((course) => {
      const enrolledStudents = users.filter((user) =>
        user.enrolledCourses?.includes(course.id)
      ).length;
      const instructor = UserModel.getUserById(course.instructorId);
      return {
        ...course,
        students: enrolledStudents,
        instructor: instructor ? instructor.name : "Unknown Instructor",
      };
    });

    if (search) {
      const searchLower = search.toLowerCase();
      courses = courses.filter(
        (course) =>
          course.title.toLowerCase().includes(searchLower) ||
          course.instructor.toLowerCase().includes(searchLower)
      );
    }

    if (category !== "all") {
      courses = courses.filter((course) => course.category === category);
    }

    switch (sort) {
      case "newest":
        courses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
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

    const categories = [
      ...new Set(CourseModel.getAllCourses().map((course) => course.category)),
    ];

    res.render("admin/courses", {
      courses,
      categories,
      search,
      category,
      sort,
    });
  },

  getNewCourseForm: (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    res.render("admin/edit-course", {
      course: null,
    });
  },

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

    const instructor = UserModel.getUserById(course.instructorId);
    const users = UserModel.getAllUsers();
    const enrolledStudents = users
      .filter((user) => user.enrolledCourses?.includes(courseId))
      .map((student) => ({
        id: student.id,
        name: student.name,
        email: student.email,
      }));

    res.render("admin/course-details", {
      course: {
        ...course,
        instructor: instructor ? instructor.name : "Unknown Instructor",
        students: enrolledStudents.length,
        rating: course.rating || "N/A",
      },
      instructor: instructor || { name: "Unknown", email: "N/A", id: null },
      enrolledStudents,
    });
  },

  getEditCourseForm: (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const courseId = req.params.id;
    const course = CourseModel.getCourseById(courseId);

    if (!course) {
      req.flash("error_msg", "Course not found");
      return res.redirect("/admin/courses");
    }

    // Ensure all required fields are present with default values
    const courseData = {
      ...course,
      title: course.title || "",
      description: course.description || "",
      category: course.category || "",
      price: course.price || 0,
      status: course.status || "draft",
      featured: course.featured || false,
      thumbnail: course.thumbnail || "/img/course-placeholder.jpg",
      modules: course.modules || [],
    };

    res.render("admin/edit-course", { course: courseData });
  },

  createCourse: (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const { title, description, category, price, status, featured } = req.body;
    const thumbnail = req.file
      ? `/uploads/${req.file.filename}`
      : "/img/course-placeholder.jpg";

    const newCourse = {
      id: `course${Date.now()}`,
      title,
      description,
      category,
      price: parseFloat(price),
      instructorId: req.session.user.id,
      instructor: req.session.user.name,
      thumbnail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: status || "draft",
      featured: featured === "on",
      modules: [],
    };

    CourseModel.createCourse(newCourse);
    req.flash("success_msg", "Course created successfully");
    res.redirect("/admin/courses");
  },

  updateCourse: (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const courseId = req.params.id;
    const course = CourseModel.getCourseById(courseId);

    if (!course) {
      req.flash("error_msg", "Course not found");
      return res.redirect("/admin/courses");
    }

    const { title, description, category, price, status, featured } = req.body;
    const thumbnail = req.file
      ? `/uploads/${req.file.filename}`
      : course.thumbnail;

    const updatedCourse = {
      ...course,
      title,
      description,
      category,
      price: parseFloat(price),
      status,
      featured: featured === "on",
      thumbnail,
      updatedAt: new Date().toISOString(),
    };

    CourseModel.updateCourse(courseId, updatedCourse);
    req.flash("success_msg", "Course updated successfully");
    res.redirect(`/admin/courses/${courseId}`);
  },

  updateCourseStatus: (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const courseId = req.params.id;
    const { status } = req.body;

    const course = CourseModel.getCourseById(courseId);
    if (!course) {
      req.flash("error_msg", "Course not found");
      return res.redirect("/admin/courses");
    }

    CourseModel.updateCourse(courseId, { status });
    req.flash("success_msg", `Course ${status} successfully`);
    res.redirect("/admin/courses");
  },

  updateCourseFeatured: (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const courseId = req.params.id;
    const { featured } = req.body;

    const course = CourseModel.getCourseById(courseId);
    if (!course) {
      req.flash("error_msg", "Course not found");
      return res.redirect("/admin/courses");
    }

    CourseModel.updateCourse(courseId, { featured: featured === "on" });
    req.flash("success_msg", "Featured status updated successfully");
    res.redirect(`/admin/courses/${courseId}`);
  },

  deleteCourse: (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const courseId = req.params.id;
    const course = CourseModel.getCourseById(courseId);

    if (!course) {
      req.flash("error_msg", "Course not found");
      return res.redirect("/admin/courses");
    }

    CourseModel.deleteCourse(courseId);
    req.flash("success_msg", "Course deleted successfully");
    res.redirect("/admin/courses");
  },

  getOrders: (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const orders = OrderModel.getAllOrders().map((order) => {
      const user = UserModel.getUserById(order.userId);
      const course = CourseModel.getCourseById(order.courseId);
      return {
        ...order,
        userName: user ? user.name : "Unknown User",
        courseTitle: course ? course.title : "Unknown Course",
      };
    });

    res.render("admin/orders", { orders });
  },

  updateOrderStatus: (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const orderId = req.params.id;
    const { status } = req.body;

    const order = OrderModel.getOrderById(orderId);
    if (!order) {
      req.flash("error_msg", "Order not found");
      return res.redirect("/admin/orders");
    }

    OrderModel.updateOrder(orderId, { status });
    req.flash("success_msg", "Order status updated successfully");
    res.redirect("/admin/orders");
  },

  getRevenue: (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const orders = OrderModel.getAllOrders();
    const totalRevenue = orders
      .filter((order) => order.status === "completed")
      .reduce((sum, order) => sum + order.amount, 0);

    const monthlyRevenue = orders
      .filter((order) => order.status === "completed")
      .reduce((acc, order) => {
        const date = new Date(order.createdAt);
        const monthYear = `${date.getFullYear()}-${date.getMonth() + 1}`;
        if (!acc[monthYear]) {
          acc[monthYear] = 0;
        }
        acc[monthYear] += order.amount;
        return acc;
      }, {});

    const monthlyRevenueData = Object.keys(monthlyRevenue)
      .map((monthYear) => ({
        month: monthYear,
        revenue: monthlyRevenue[monthYear].toFixed(2),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    res.render("admin/revenue", {
      totalRevenue: totalRevenue.toFixed(2),
      monthlyRevenue: monthlyRevenueData,
    });
  },
};

module.exports = AdminController;