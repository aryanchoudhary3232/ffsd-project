const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "public/uploads/";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// Data helpers
const readData = () => {
  const filePath = path.join(__dirname, "../data.json");
  console.log("Reading data.json from path:", filePath); // Debug: Log the file path
  if (!fs.existsSync(filePath)) {
    console.log("data.json does not exist, creating with default data");
    const defaultData = { courses: [], users: [], orders: [] };
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  const fileContent = fs.readFileSync(filePath, "utf8");
  console.log("Raw file content:", fileContent); // Debug: Log the raw file content
  const data = JSON.parse(fileContent);
  console.log("Parsed data:", data); // Debug: Log the parsed data
  return data;
};

const writeData = (data) => {
  const filePath = path.join(__dirname, "../data.json");
  console.log("Writing to data.json at path:", filePath); // Debug: Log the write path
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// Admin middleware
const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === "admin") return next();
  res.redirect("/dashboard");
};

// GET: Render admin dashboard
router.get("/dashboard", isAdmin, (req, res) => {
  const data = readData();
  const courses = data.courses || [];
  const users = data.users || [];
  console.log("Users array in dashboard route:", users); // Debug: Log the users array

  // Calculate stats
  const totalUsers = users.length;
  console.log("Total users calculated:", totalUsers); // Debug: Log the total users
  const totalCourses = courses.length;
  const totalInstructors = users.filter(
    (user) => user.role === "instructor"
  ).length;
  const totalRevenue = data.orders
    ? data.orders.reduce((sum, order) => sum + order.amount, 0)
    : 0;

  // User distribution
  const studentCount = users.filter((user) => user.role === "student").length;
  const instructorCount = totalInstructors;
  const adminCount = users.filter((user) => user.role === "admin").length;

  // Avoid division by zero; set percentages to 0 if no users
  const studentPercentage =
    totalUsers > 0 ? Math.round((studentCount / totalUsers) * 100) : 0;
  const instructorPercentage =
    totalUsers > 0 ? Math.round((instructorCount / totalUsers) * 100) : 0;
  const adminPercentage =
    totalUsers > 0 ? Math.round((adminCount / totalUsers) * 100) : 0;

  const stats = {
    totalUsers,
    totalCourses,
    totalInstructors,
    totalRevenue,
    userDistribution: {
      students: { count: studentCount, percentage: studentPercentage },
      instructors: { count: instructorCount, percentage: instructorPercentage },
      admins: { count: adminCount, percentage: adminPercentage },
    },
  };

  const recentUsers = users
    .sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate))
    .slice(0, 5);

  const recentCourses = courses
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  res.render("admin/dashboard", { stats, recentUsers, recentCourses });
});

// GET: Render course list with filters
router.get("/courses", isAdmin, (req, res) => {
  const data = readData();
  let courses = data.courses || [];
  const { search, category, sort } = req.query;

  const categories = [
    ...new Set(data.courses.map((course) => course.category)),
  ];

  if (search) {
    courses = courses.filter(
      (course) =>
        course.title.toLowerCase().includes(search.toLowerCase()) ||
        course.instructor.toLowerCase().includes(search.toLowerCase())
    );
  }

  if (category && category !== "all") {
    courses = courses.filter((course) => course.category === category);
  }

  if (sort) {
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
    }
  }

  res.render("admin/courses", {
    courses,
    search: search || "",
    category: category || "all",
    sort: sort || "newest",
    categories,
  });
});

// GET: Render course creation form
router.get("/courses/new", isAdmin, (req, res) => {
  const data = readData();
  const categories = [
    ...new Set(data.courses.map((course) => course.category)),
  ];
  res.render("instructor/course-form", {
    isEdit: false,
    course: {},
    categories,
  });
});

// POST: Create new course
router.post("/courses/new", isAdmin, upload.single("thumbnail"), (req, res) => {
  try {
    const data = readData();
    const newCourse = {
      id: Date.now().toString(),
      title: req.body.title,
      category: req.body.category,
      description: req.body.description,
      price: parseFloat(req.body.price),
      thumbnail: req.file
        ? `/uploads/${req.file.filename}`
        : "/img/default-thumbnail.jpg",
      instructor: "Admin Assigned",
      instructorId: null,
      students: 0,
      rating: 0,
      revenue: 0,
      status: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      modules: [],
    };

    data.courses = data.courses || [];
    data.courses.push(newCourse);
    writeData(data);

    req.flash("success_msg", "Course created successfully");
    res.redirect("/admin/courses");
  } catch (error) {
    console.error("Error creating course:", error);
    req.flash("error_msg", "Failed to create course. Please try again.");
    res.redirect("/admin/courses/new");
  }
});

// GET: View course details
router.get("/courses/:id", isAdmin, (req, res) => {
  const data = readData();
  const course = data.courses.find((c) => c.id === req.params.id);
  if (!course) {
    return res.status(404).render("error", { message: "Course not found" });
  }
  // Ensure data.users exists before calling .find()
  const instructor =
    data.users && data.users.length > 0
      ? data.users.find((u) => u.id === course.instructorId) || {
          name: course.instructor,
          email: "N/A",
          id: null,
        }
      : { name: course.instructor, email: "N/A", id: null };
  const enrolledStudents =
    data.users && data.users.length > 0
      ? data.users.filter(
          (u) => u.enrolledCourses && u.enrolledCourses.includes(course.id)
        )
      : [];
  // Set isEnrolled to false for admins
  const isEnrolled = false;
  res.render("courses/details", {
    course,
    instructor,
    enrolledStudents,
    isEnrolled,
  });
});

// GET: Render course edit form
router.get("/courses/:id/edit", isAdmin, (req, res) => {
  const data = readData();
  const course = data.courses.find((c) => c.id === req.params.id);
  if (!course) {
    return res.status(404).render("error", { message: "Course not found" });
  }
  const categories = [
    ...new Set(data.courses.map((course) => course.category)),
  ];
  res.render("instructor/course-form", { isEdit: true, course, categories });
});

// POST: Update course
router.post(
  "/courses/:id/edit",
  isAdmin,
  upload.single("thumbnail"),
  (req, res) => {
    try {
      const data = readData();
      const courseIndex = data.courses.findIndex((c) => c.id === req.params.id);
      if (courseIndex === -1) {
        return res.status(404).render("error", { message: "Course not found" });
      }

      const updatedCourse = {
        ...data.courses[courseIndex],
        title: req.body.title,
        category: req.body.category,
        description: req.body.description,
        price: parseFloat(req.body.price),
        thumbnail: req.file
          ? `/uploads/${req.file.filename}`
          : data.courses[courseIndex].thumbnail,
        updatedAt: new Date().toISOString(),
      };

      data.courses[courseIndex] = updatedCourse;
      writeData(data);

      req.flash("success_msg", "Course updated successfully");
      res.redirect("/admin/courses");
    } catch (error) {
      console.error("Error updating course:", error);
      req.flash("error_msg", "Failed to update course. Please try again.");
      res.redirect(`/admin/courses/${req.params.id}/edit`);
    }
  }
);

// POST: Delete course
router.post("/courses/:id/delete", isAdmin, (req, res) => {
  try {
    const data = readData();
    const courseIndex = data.courses.findIndex((c) => c.id === req.params.id);
    if (courseIndex === -1) {
      return res.status(404).render("error", { message: "Course not found" });
    }

    data.courses.splice(courseIndex, 1);
    writeData(data);

    req.flash("success_msg", "Course deleted successfully");
    res.redirect("/admin/courses");
  } catch (error) {
    console.error("Error deleting course:", error);
    req.flash("error_msg", "Failed to delete course. Please try again.");
    res.redirect("/admin/courses");
  }
});

// GET: Render revenue page
router.get("/revenue", isAdmin, (req, res) => {
  const data = readData();
  const orders = data.orders || [];
  const totalRevenue = orders.reduce((sum, order) => sum + order.amount, 0);

  const currentMonth = new Date().getMonth();
  const monthlyRevenue = orders
    .filter((order) => new Date(order.createdAt).getMonth() === currentMonth)
    .reduce((sum, order) => sum + order.amount, 0);

  const recentOrders = orders
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)
    .map((order) => ({
      ...order,
      userName:
        data.users && data.users.length > 0
          ? data.users.find((u) => u.id === order.userId)?.name || "Unknown"
          : "Unknown",
      courseTitle:
        data.courses.find((c) => c.id === order.courseId)?.title || "Unknown",
    }));

  const chartData = Array(12)
    .fill(0)
    .map((_, i) => ({
      month: i,
      revenue: orders
        .filter((o) => new Date(o.createdAt).getMonth() === i)
        .reduce((sum, o) => sum + o.amount, 0),
    }));

  const categoryRevenue = [...new Set(data.courses.map((c) => c.category))].map(
    (cat) => ({
      name: cat,
      revenue: orders
        .filter(
          (o) => data.courses.find((c) => c.id === o.courseId)?.category === cat
        )
        .reduce((sum, o) => sum + o.amount, 0),
    })
  );

  res.render("admin/revenue", {
    totalRevenue,
    monthlyRevenue,
    recentOrders,
    chartData,
    categoryRevenue,
  });
});

// GET: Render manage users page
router.get("/users", isAdmin, (req, res) => {
  const data = readData();
  const users = data.users || [];
  res.render("admin/users", { users });
});

module.exports = router;
