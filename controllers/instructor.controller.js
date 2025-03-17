const CourseModel = require("../models/course.model");
const UserModel = require("../models/user.model");
const OrderModel = require("../models/order.model");
const ProgressModel = require("../models/progress.model");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../public/uploads");
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
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
      return res.redirect("/login");
    }

    const courseId = req.params.id;
    const instructorId = req.session.user.id;
    const { title } = req.body;

    try {
      const course = CourseModel.getCourseById(courseId);

      if (!course || course.instructorId !== instructorId) {
        req.flash(
          "error_msg",
          "Course not found or you do not have permission to edit it"
        );
        return res.redirect("/instructor/courses");
      }

      CourseModel.addModuleToCourse(courseId, { title });

      req.flash("success_msg", "Module added successfully");
      res.redirect(`/instructor/courses/${courseId}/content`);
    } catch (error) {
      req.flash("error_msg", error.message);
      res.redirect(`/instructor/courses/${courseId}/content`);
    }
  },

  // Update module
  updateModule: (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.redirect("/login");
    }

    const { id: courseId, moduleId } = req.params;
    const instructorId = req.session.user.id;
    const { title } = req.body;

    try {
      const course = CourseModel.getCourseById(courseId);

      if (!course || course.instructorId !== instructorId) {
        req.flash(
          "error_msg",
          "Course not found or you do not have permission to edit it"
        );
        return res.redirect("/instructor/courses");
      }

      // Find the module
      const moduleIndex = course.modules.findIndex((m) => m.id === moduleId);

      if (moduleIndex === -1) {
        req.flash("error_msg", "Module not found");
        return res.redirect(`/instructor/courses/${courseId}/content`);
      }

      // Update module
      course.modules[moduleIndex].title = title;
      course.updatedAt = new Date().toISOString();

      // Save changes
      CourseModel.updateCourse(courseId, { modules: course.modules });

      req.flash("success_msg", "Module updated successfully");
      res.redirect(`/instructor/courses/${courseId}/content`);
    } catch (error) {
      req.flash("error_msg", error.message);
      res.redirect(`/instructor/courses/${courseId}/content`);
    }
  },

  // Delete module
  deleteModule: (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.redirect("/login");
    }

    const { id: courseId, moduleId } = req.params;
    const instructorId = req.session.user.id;

    try {
      const course = CourseModel.getCourseById(courseId);

      if (!course || course.instructorId !== instructorId) {
        req.flash(
          "error_msg",
          "Course not found or you do not have permission to edit it"
        );
        return res.redirect("/instructor/courses");
      }

      // Find the module index
      const moduleIndex = course.modules.findIndex((m) => m.id === moduleId);

      if (moduleIndex === -1) {
        req.flash("error_msg", "Module not found");
        return res.redirect(`/instructor/courses/${courseId}/content`);
      }

      // Remove module
      course.modules.splice(moduleIndex, 1);
      course.updatedAt = new Date().toISOString();

      // Save changes
      CourseModel.updateCourse(courseId, { modules: course.modules });

      req.flash("success_msg", "Module deleted successfully");
      res.redirect(`/instructor/courses/${courseId}/content`);
    } catch (error) {
      req.flash("error_msg", error.message);
      res.redirect(`/instructor/courses/${courseId}/content`);
    }
  },

  // Add lesson to module
  addLesson: (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.redirect("/login");
    }

    const { id: courseId, moduleId } = req.params;
    const instructorId = req.session.user.id;

    upload.single("file")(req, res, (err) => {
      if (err) {
        req.flash("error_msg", "Error uploading file");
        return res.redirect(`/instructor/courses/${courseId}/content`);
      }

      const { title, type, duration } = req.body;

      try {
        const course = CourseModel.getCourseById(courseId);

        if (!course || course.instructorId !== instructorId) {
          req.flash(
            "error_msg",
            "Course not found or you do not have permission to edit it"
          );
          return res.redirect("/instructor/courses");
        }

        // Find the module
        const moduleIndex = course.modules.findIndex((m) => m.id === moduleId);

        if (moduleIndex === -1) {
          req.flash("error_msg", "Module not found");
          return res.redirect(`/instructor/courses/${courseId}/content`);
        }

        // Create new lesson
        const newLesson = {
          id: Date.now().toString(),
          title,
          type,
          duration: duration || "",
          file: req.file ? `/uploads/${req.file.filename}` : null,
        };

        // Add lesson to module
        course.modules[moduleIndex].lessons.push(newLesson);
        course.updatedAt = new Date().toISOString();

        // Save changes
        CourseModel.updateCourse(courseId, { modules: course.modules });

        req.flash("success_msg", "Lesson added successfully");
        res.redirect(`/instructor/courses/${courseId}/content`);
      } catch (error) {
        req.flash("error_msg", error.message);
        res.redirect(`/instructor/courses/${courseId}/content`);
      }
    });
  },

  // Update lesson
  updateLesson: (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.redirect("/login");
    }

    const { id: courseId, moduleId, lessonId } = req.params;
    const instructorId = req.session.user.id;

    upload.single("file")(req, res, (err) => {
      if (err) {
        req.flash("error_msg", "Error uploading file");
        return res.redirect(`/instructor/courses/${courseId}/content`);
      }

      const { title, type, duration } = req.body;

      try {
        const course = CourseModel.getCourseById(courseId);

        if (!course || course.instructorId !== instructorId) {
          req.flash(
            "error_msg",
            "Course not found or you do not have permission to edit it"
          );
          return res.redirect("/instructor/courses");
        }

        // Find the module
        const moduleIndex = course.modules.findIndex((m) => m.id === moduleId);

        if (moduleIndex === -1) {
          req.flash("error_msg", "Module not found");
          return res.redirect(`/instructor/courses/${courseId}/content`);
        }

        // Find the lesson
        const lessonIndex = course.modules[moduleIndex].lessons.findIndex(
          (l) => l.id === lessonId
        );

        if (lessonIndex === -1) {
          req.flash("error_msg", "Lesson not found");
          return res.redirect(`/instructor/courses/${courseId}/content`);
        }

        // Update lesson
        course.modules[moduleIndex].lessons[lessonIndex] = {
          ...course.modules[moduleIndex].lessons[lessonIndex],
          title,
          type,
          duration: duration || "",
          file: req.file
            ? `/uploads/${req.file.filename}`
            : course.modules[moduleIndex].lessons[lessonIndex].file,
        };

        course.updatedAt = new Date().toISOString();

        // Save changes
        CourseModel.updateCourse(courseId, { modules: course.modules });

        req.flash("success_msg", "Lesson updated successfully");
        res.redirect(`/instructor/courses/${courseId}/content`);
      } catch (error) {
        req.flash("error_msg", error.message);
        res.redirect(`/instructor/courses/${courseId}/content`);
      }
    });
  },

  // Delete lesson
  deleteLesson: (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.redirect("/login");
    }

    const { id: courseId, moduleId, lessonId } = req.params;
    const instructorId = req.session.user.id;

    try {
      const course = CourseModel.getCourseById(courseId);

      if (!course || course.instructorId !== instructorId) {
        req.flash(
          "error_msg",
          "Course not found or you do not have permission to edit it"
        );
        return res.redirect("/instructor/courses");
      }

      // Find the module
      const moduleIndex = course.modules.findIndex((m) => m.id === moduleId);

      if (moduleIndex === -1) {
        req.flash("error_msg", "Module not found");
        return res.redirect(`/instructor/courses/${courseId}/content`);
      }

      // Find the lesson
      const lessonIndex = course.modules[moduleIndex].lessons.findIndex(
        (l) => l.id === lessonId
      );

      if (lessonIndex === -1) {
        req.flash("error_msg", "Lesson not found");
        return res.redirect(`/instructor/courses/${courseId}/content`);
      }

      // Remove lesson
      course.modules[moduleIndex].lessons.splice(lessonIndex, 1);
      course.updatedAt = new Date().toISOString();

      // Save changes
      CourseModel.updateCourse(courseId, { modules: course.modules });

      req.flash("success_msg", "Lesson deleted successfully");
      res.redirect(`/instructor/courses/${courseId}/content`);
    } catch (error) {
      req.flash("error_msg", error.message);
      res.redirect(`/instructor/courses/${courseId}/content`);
    }
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
