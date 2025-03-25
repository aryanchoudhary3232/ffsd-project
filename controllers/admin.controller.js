// const UserModel = require("../models/user.model");
// const CourseModel = require("../models/course.model");
// const OrderModel = require("../models/order.model");

// // Admin controller
// const AdminController = {
//   // Get admin dashboard
//   getAdminDashboard: (req, res) => {
//     if (!req.session.user || req.session.user.role !== "admin") {
//       return res.redirect("/login");
//     }

//     // Calculate stats
//     const totalUsers = UserModel.getUserCount();
//     const totalCourses = CourseModel.getCourseCount();
//     const totalInstructors = UserModel.getUsersByRole("instructor").length;
//     const totalRevenue = OrderModel.getTotalRevenue();

//     // Get recent users
//     const recentUsers = UserModel.getAllUsers()
//       .sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate))
//       .slice(0, 5);

//     // Get recent courses
//     const recentCourses = CourseModel.getAllCourses()
//       .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
//       .slice(0, 5);

//     res.render("admin/dashboard", {
//       stats: {
//         totalUsers,
//         totalCourses,
//         totalInstructors,
//         totalRevenue,
//       },
//       recentUsers,
//       recentCourses,
//     });
//   },

//   // Get user management page
//   getUserManagement: (req, res) => {
//     if (!req.session.user || req.session.user.role !== "admin") {
//       return res.redirect("/login");
//     }

//     const { search, role, sort } = req.query;
//     let users = UserModel.getAllUsers();

//     // Apply search filter
//     if (search) {
//       const searchLower = search.toLowerCase();
//       users = users.filter(
//         (user) =>
//           user.name.toLowerCase().includes(searchLower) ||
//           user.email.toLowerCase().includes(searchLower)
//       );
//     }

//     // Apply role filter
//     if (role && role !== "all") {
//       users = users.filter((user) => user.role === role);
//     }

//     // Apply sorting
//     if (sort) {
//       switch (sort) {
//         case "name-asc":
//           users.sort((a, b) => a.name.localeCompare(b.name));
//           break;
//         case "name-desc":
//           users.sort((a, b) => b.name.localeCompare(a.name));
//           break;
//         case "newest":
//           users.sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate));
//           break;
//         case "oldest":
//           users.sort((a, b) => new Date(a.joinDate) - new Date(b.joinDate));
//           break;
//       }
//     } else {
//       // Default sort by newest
//       users.sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate));
//     }

//     res.render("admin/users", {
//       users,
//       search: search || "",
//       role: role || "all",
//       sort: sort || "newest",
//     });
//   },

//   // Get user details
//   // Get user details
//   getUserDetails: (req, res) => {
//     if (!req.session.user || req.session.user.role !== "admin") {
//       return res.redirect("/login");
//     }

//     const userId = req.params.id;
//     const user = UserModel.getUserById(userId);

//     if (!user) {
//       req.flash("error_msg", "User not found");
//       return res.redirect("/admin/users");
//     }

//     // Get user's enrolled courses
//     const enrolledCourses = UserModel.getUserEnrolledCourses(userId);

//     // Get user's orders
//     const orders = OrderModel.getOrdersByUser(userId).map((order) => {
//       const course = CourseModel.getCourseById(order.courseId);
//       return {
//         ...order,
//         courseTitle: course ? course.title : "Unknown Course",
//       };
//     });

//     // Always define instructorCourses even if it's an empty array
//     let instructorCourses = [];
//     if (user.role === "instructor") {
//       // Adjust the filtering logic according to how courses are linked to instructors.
//       instructorCourses = CourseModel.getAllCourses().filter(
//         (course) => course.instructorId === userId
//       );
//     }

//     res.render("admin/user-details", {
//       user,
//       enrolledCourses,
//       instructorCourses, // Make sure this is included!
//       orders,
//       adminCount: 2,
//     });
//   },

//   // Update user
//   updateUser: (req, res) => {
//     if (!req.session.user || req.session.user.role !== "admin") {
//       return res.redirect("/login");
//     }

//     const userId = req.params.id;
//     const { name, email, role } = req.body;

//     try {
//       UserModel.updateUser(userId, { name, email, role });

//       req.flash("success_msg", "User updated successfully");
//       res.redirect(`/admin/users/${userId}`);
//     } catch (error) {
//       req.flash("error_msg", error.message);
//       res.redirect(`/admin/users/${userId}`);
//     }
//   },

//   // Delete user
//   deleteUser: (req, res) => {
//     if (!req.session.user || req.session.user.role !== "admin") {
//       return res.redirect("/login");
//     }

//     const userId = req.params.id;

//     try {
//       UserModel.deleteUser(userId);

//       req.flash("success_msg", "User deleted successfully");
//       res.redirect("/admin/users");
//     } catch (error) {
//       req.flash("error_msg", error.message);
//       res.redirect("/admin/users");
//     }
//   },

//   // Get course management page
//   getCourseManagement: (req, res) => {
//     if (!req.session.user || req.session.user.role !== "admin") {
//       return res.redirect("/login");
//     }

//     const { search, category, sort } = req.query;
//     let courses = CourseModel.getAllCourses();
//     const categories = CourseModel.getAllCategories();

//     // Apply search filter
//     if (search) {
//       const searchLower = search.toLowerCase();
//       courses = courses.filter(
//         (course) =>
//           course.title.toLowerCase().includes(searchLower) ||
//           course.instructor.toLowerCase().includes(searchLower)
//       );
//     }

//     // Apply category filter
//     if (category && category !== "all") {
//       courses = courses.filter((course) => course.category === category);
//     }

//     // Apply sorting
//     if (sort) {
//       switch (sort) {
//         case "title-asc":
//           courses.sort((a, b) => a.title.localeCompare(b.title));
//           break;
//         case "title-desc":
//           courses.sort((a, b) => b.title.localeCompare(a.title));
//           break;
//         case "newest":
//           courses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
//           break;
//         case "oldest":
//           courses.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
//           break;
//       }
//     } else {
//       // Default sort by newest
//       courses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
//     }

//     res.render("admin/courses", {
//       courses,
//       categories,
//       search: search || "",
//       category: category || "all",
//       sort: sort || "newest",
//     });
//   },

//   // Get course details
//   getCourseDetails: (req, res) => {
//     if (!req.session.user || req.session.user.role !== "admin") {
//       return res.redirect("/login");
//     }

//     const courseId = req.params.id;
//     const course = CourseModel.getCourseById(courseId);

//     if (!course) {
//       req.flash("error_msg", "Course not found");
//       return res.redirect("/admin/courses");
//     }

//     // Get instructor
//     const instructor = UserModel.getUserById(course.instructorId);

//     // Get enrolled students
//     const enrolledStudents = UserModel.getAllUsers().filter((user) =>
//       user.enrolledCourses.includes(courseId)
//     );

//     // Get course orders
//     const orders = OrderModel.getOrdersByCourse(courseId).map((order) => {
//       const user = UserModel.getUserById(order.userId);
//       return {
//         ...order,
//         userName: user ? user.name : "Unknown User",
//       };
//     });

//     res.render("admin/course-details", {
//       course,
//       instructor,
//       enrolledStudents,
//       orders,
//     });
//   },

//   // Update course
//   updateCourse: (req, res) => {
//     if (!req.session.user || req.session.user.role !== "admin") {
//       return res.redirect("/login");
//     }

//     const courseId = req.params.id;
//     const { title, description, category, price, featured } = req.body;

//     try {
//       CourseModel.updateCourse(courseId, {
//         title,
//         description,
//         category,
//         price: Number.parseFloat(price),
//       });

//       // Update featured status
//       if (featured !== undefined) {
//         CourseModel.markAsFeatured(courseId, featured === "on");
//       }

//       req.flash("success_msg", "Course updated successfully");
//       res.redirect(`/admin/courses/${courseId}`);
//     } catch (error) {
//       req.flash("error_msg", error.message);
//       res.redirect(`/admin/courses/${courseId}`);
//     }
//   },

//   // Delete course
//   deleteCourse: (req, res) => {
//     if (!req.session.user || req.session.user.role !== "admin") {
//       return res.redirect("/login");
//     }

//     const courseId = req.params.id;

//     try {
//       CourseModel.deleteCourse(courseId);

//       req.flash("success_msg", "Course deleted successfully");
//       res.redirect("/admin/courses");
//     } catch (error) {
//       req.flash("error_msg", error.message);
//       res.redirect("/admin/courses");
//     }
//   },

//   getRevenueManagement: (req, res) => {
//     if (!req.session.user || req.session.user.role !== "admin") {
//       return res.redirect("/login");
//     }

//     // Get all orders
//     const orders = OrderModel.getAllOrders().filter(
//       (order) => order.status === "completed"
//     );

//     // Calculate total revenue
//     const totalRevenue = OrderModel.getTotalRevenue();

//     // Get revenue by month
//     const revenueByMonth = OrderModel.getRevenueByMonth();

//     // Calculate monthly revenue (revenue for the current month)
//     const currentMonth = new Date().toLocaleString("default", {
//       month: "long",
//     });
//     const monthlyRevenue =
//       revenueByMonth.find((month) => month.month === currentMonth)?.revenue ||
//       0;

//     // Get recent orders
//     const recentOrders = OrderModel.getRecentOrders(10);

//     // Calculate revenue by category (example logic - replace with your actual logic)
//     const categoryRevenue = [
//       { name: "Programming", revenue: 30000 },
//       { name: "Design", revenue: 15000 },
//       { name: "Business", revenue: 10000 },
//       { name: "Marketing", revenue: 5000 },
//     ];
//     // const categoryRevenue = Object.keys(revenueByCategory).map((category) => ({
//     //   name: category,
//     //   revenue: revenueByCategory[category],
//     // }));

//     // Render the EJS template with the data
//     res.render("admin/revenue", {
//       totalRevenue,
//       monthlyRevenue,
//       chartData: revenueByMonth,
//       recentOrders,
//       categoryRevenue,
//     });
//   },
// };

// module.exports = AdminController;
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
          // Sorting: Sorts courses by createdAt (descending, newest first), converting to Date objects for accurate comparison.
// Slicing: Takes the top 5 entries.
// Mapping: Adds the instructor’s name by looking up instructorId in UserModel; defaults to "Unknown Instructor" if not found.
// Highlights the 5 most recently created courses, including who created them.
// Enhances usability by linking courses to instructors.
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
      // Percentages: Computes the percentage of each role
      //  relative to totalUsers, with a ternary operator to 
      // handle division by zero (returns 0 if totalUsers is 0
      // ). .toFixed(1) rounds to one decimal place.
      admins: {
        percentage: totalUsers
          ? ((totalAdmins / totalUsers) * 100).toFixed(1)
          : 0,
      },
      // Provides a breakdown of user roles as percentages, useful for understanding the platform’s user composition (e.g., for pie charts in the UI).
// 7. Stats Object
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
        courses.sort((a, b) => b.price - b.price);
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

    CourseModel.addCourse(newCourse);
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
