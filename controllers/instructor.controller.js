const CourseModel = require("../models/course.model");
const UserModel = require("../models/user.model");
const OrderModel = require("../models/order.model");
const ProgressModel = require("../models/progress.model"); // Added import for ProgressModel
const multer = require("multer");
const path = require("path");

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

// Instructor controller
const InstructorController = {
  // Get instructor dashboard
  getInstructorDashboard: (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.redirect("/login");
    }

    const userId = req.session.user.id;
    const instructorCourses = CourseModel.getCoursesByInstructor(userId);

    // Calculate total students and revenue
    let totalStudents = 0;
    let totalRevenue = 0;

    for (const course of instructorCourses) {
      // Count enrollments
      const enrollments = UserModel.getAllUsers().filter((user) =>
        user.enrolledCourses.includes(course.id)
      ).length;

      totalStudents += enrollments;

      // Calculate revenue
      const courseOrders = OrderModel.getOrdersByCourse(course.id).filter(
        (order) => order.status === "completed"
      );

      const courseRevenue = courseOrders.reduce(
        (sum, order) => sum + order.amount,
        0
      );
      totalRevenue += courseRevenue;
    }

    // Get recent orders
    const recentOrders = OrderModel.getAllOrders()
      .filter((order) =>
        instructorCourses.some((course) => course.id === order.courseId)
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map((order) => {
        const user = UserModel.getUserById(order.userId);
        const course = CourseModel.getCourseById(order.courseId);

        return {
          ...order,
          userName: user ? user.name : "Unknown User",
          courseTitle: course ? course.title : "Unknown Course",
        };
      });

    res.render("instructor/dashboard", {
      courses: instructorCourses,
      totalStudents,
      totalRevenue,
      recentOrders,
    });
  },

  // Get instructor courses
  getInstructorCourses: (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.redirect("/login");
    }

    const userId = req.session.user.id;
    const instructorCourses = CourseModel.getCoursesByInstructor(userId);

    // Enhance courses with student count and revenue
    const enhancedCourses = instructorCourses.map((course) => {
      const studentCount = UserModel.getAllUsers().filter((user) =>
        user.enrolledCourses.includes(course.id)
      ).length;

      const revenue = OrderModel.getOrdersByCourse(course.id)
        .filter((order) => order.status === "completed")
        .reduce((sum, order) => sum + order.amount, 0);

      return {
        ...course,
        studentCount,
        revenue,
      };
    });

    res.render("instructor/courses", {
      courses: enhancedCourses,
    });
  },

  // Get create course form
  getCreateCourseForm: (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.redirect("/login");
    }

    res.render("instructor/course-form", {
      course: null,
      isEdit: false,
    });
  },

  // Create new course
  createCourse: (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.redirect("/login");
    }

    upload.single("thumbnail")(req, res, (err) => {
      if (err) {
        req.flash("error_msg", "Error uploading file");
        return res.redirect("/instructor/courses/new");
      }

      const { title, description, category, price } = req.body;
      const instructorId = req.session.user.id;

      try {
        const newCourse = CourseModel.createCourse({
          title,
          description,
          category,
          price,
          instructorId,
          instructor: req.session.user.name,
          thumbnail: req.file
            ? `/uploads/${req.file.filename}`
            : "/img/course-placeholder.jpg",
        });

        req.flash("success_msg", "Course created successfully");
        res.redirect(`/instructor/courses/${newCourse.id}/edit`);
      } catch (error) {
        req.flash("error_msg", error.message);
        res.redirect("/instructor/courses/new");
      }
    });
  },

  // Get edit course form
  getEditCourseForm: (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.redirect("/login");
    }

    const courseId = req.params.id;
    const instructorId = req.session.user.id;
    const course = CourseModel.getCourseById(courseId);

    if (!course || course.instructorId !== instructorId) {
      req.flash(
        "error_msg",
        "Course not found or you do not have permission to edit it"
      );
      return res.redirect("/instructor/courses");
    }

    res.render("instructor/course-form", {
      course,
      isEdit: true,
    });
  },

  // Update course
  updateCourse: (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.redirect("/login");
    }

    const courseId = req.params.id;
    const instructorId = req.session.user.id;
    const course = CourseModel.getCourseById(courseId);

    if (!course || course.instructorId !== instructorId) {
      req.flash(
        "error_msg",
        "Course not found or you do not have permission to edit it"
      );
      return res.redirect("/instructor/courses");
    }

    upload.single("thumbnail")(req, res, (err) => {
      if (err) {
        req.flash("error_msg", "Error uploading file");
        return res.redirect(`/instructor/courses/${courseId}/edit`);
      }

      const { title, description, category, price } = req.body;

      try {
        const updatedCourse = CourseModel.updateCourse(courseId, {
          title,
          description,
          category,
          price: Number.parseFloat(price),
          thumbnail: req.file
            ? `/uploads/${req.file.filename}`
            : course.thumbnail,
        });

        req.flash("success_msg", "Course updated successfully");
        res.redirect("/instructor/courses");
      } catch (error) {
        req.flash("error_msg", error.message);
        res.redirect(`/instructor/courses/${courseId}/edit`);
      }
    });
  },

  // Get course content management page
  getCourseContentPage: (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.redirect("/login");
    }

    const courseId = req.params.id;
    const instructorId = req.session.user.id;
    const course = CourseModel.getCourseById(courseId);

    if (!course || course.instructorId !== instructorId) {
      req.flash(
        "error_msg",
        "Course not found or you do not have permission to edit it"
      );
      return res.redirect("/instructor/courses");
    }

    res.render("instructor/course-content", {
      course,
    });
  },

  // Add module to course
  addModule: (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const courseId = req.params.id;
    const instructorId = req.session.user.id;
    const { title } = req.body;

    try {
      const course = CourseModel.getCourseById(courseId);

      if (!course || course.instructorId !== instructorId) {
        return res.status(403).json({
          success: false,
          message: "Course not found or you do not have permission to edit it",
        });
      }

      const newModule = CourseModel.addModuleToCourse(courseId, { title });

      res.json({ success: true, module: newModule });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Add lesson to module
  addLesson: (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { courseId, moduleId } = req.params;
    const instructorId = req.session.user.id;

    upload.single("file")(req, res, (err) => {
      if (err) {
        return res
          .status(400)
          .json({ success: false, message: "Error uploading file" });
      }

      const { title, type, duration } = req.body;

      try {
        const course = CourseModel.getCourseById(courseId);

        if (!course || course.instructorId !== instructorId) {
          return res.status(403).json({
            success: false,
            message:
              "Course not found or you do not have permission to edit it",
          });
        }

        const newLesson = CourseModel.addLessonToModule(courseId, moduleId, {
          title,
          type,
          duration,
          file: req.file ? `/uploads/${req.file.filename}` : null,
        });

        res.json({ success: true, lesson: newLesson });
      } catch (error) {
        res.status(400).json({ success: false, message: error.message });
      }
    });
  },

  // Get instructor analytics
  getInstructorAnalytics: (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.redirect("/login");
    }

    const userId = req.session.user.id;
    const instructorCourses = CourseModel.getCoursesByInstructor(userId);

    // Calculate revenue by course
    const revenueByCourseName = {};
    let totalRevenue = 0;

    for (const course of instructorCourses) {
      const courseOrders = OrderModel.getOrdersByCourse(course.id).filter(
        (order) => order.status === "completed"
      );

      const courseRevenue = courseOrders.reduce(
        (sum, order) => sum + order.amount,
        0
      );

      revenueByCourseName[course.title] = courseRevenue;
      totalRevenue += courseRevenue;
    }

    // Calculate student engagement (completion rate)
    const courseCompletionRates = instructorCourses.map((course) => {
      const completionRate = ProgressModel.getCourseCompletionRate(course.id);
      return {
        course: course.title,
        completionRate,
      };
    });

    res.render("instructor/analytics", {
      courses: instructorCourses,
      revenueByCourseName,
      totalRevenue,
      courseCompletionRates,
    });
  },

  // Get instructor students
  getInstructorStudents: (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.redirect("/login");
    }

    const userId = req.session.user.id;
    const instructorCourses = CourseModel.getCoursesByInstructor(userId);
    const courseIds = instructorCourses.map((course) => course.id);

    // Get all students enrolled in instructor's courses
    const allUsers = UserModel.getAllUsers();
    const students = allUsers.filter(
      (user) =>
        user.role === "student" &&
        user.enrolledCourses.some((courseId) => courseIds.includes(courseId))
    );

    // Enhance students with course info
    const enhancedStudents = students.map((student) => {
      const enrolledInstructorCourses = student.enrolledCourses
        .filter((courseId) => courseIds.includes(courseId))
        .map((courseId) => {
          const course = CourseModel.getCourseById(courseId);
          const progress = ProgressModel.getProgress(student.id, courseId);
          return {
            ...course,
            progress: progress.progress,
          };
        });

      return {
        ...student,
        courses: enrolledInstructorCourses,
      };
    });

    res.render("instructor/students", {
      students: enhancedStudents,
    });
  },
};

module.exports = InstructorController;
