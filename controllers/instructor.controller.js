const CourseModel = require("../models/course.model");
const UserModel = require("../models/user.model");
const OrderModel = require("../models/order.model");
const ProgressModel = require("../models/progress.model");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(__dirname, "../public/uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

// Instructor controller
const InstructorController = {
  getInstructorDashboard: (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.redirect("/login");
    }

    const userId = req.session.user.id;
    const instructorCourses = CourseModel.getCoursesByInstructor(userId);

    let totalStudents = 0;
    let totalRevenue = 0;

    for (const course of instructorCourses) {
      const enrollments = UserModel.getAllUsers().filter((user) =>
        user.enrolledCourses.includes(course.id)
      ).length;

      totalStudents += enrollments;

      const courseOrders = OrderModel.getOrdersByCourse(course.id).filter(
        (order) => order.status === "completed"
      );

      const courseRevenue = courseOrders.reduce(
        (sum, order) => sum + order.amount,
        0
      );
      totalRevenue += courseRevenue;
    }

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

  getInstructorCourses: (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.redirect("/login");
    }

    const userId = req.session.user.id;
    let instructorCourses = CourseModel.getCoursesByInstructor(userId);

    // Apply sorting
    const sortFilter = req.query.sort || "newest";
    instructorCourses.sort((a, b) => {
      if (sortFilter === "newest") {
        return new Date(b.createdAt) - new Date(a.createdAt);
      } else if (sortFilter === "oldest") {
        return new Date(a.createdAt) - new Date(b.createdAt);
      } else if (sortFilter === "title-asc") {
        return a.title.localeCompare(b.title);
      } else if (sortFilter === "title-desc") {
        return b.title.localeCompare(a.title);
      } else if (sortFilter === "students") {
        return b.students - a.students;
      } else if (sortFilter === "revenue") {
        const revenueA = OrderModel.getOrdersByCourse(a.id)
          .filter((order) => order.status === "completed")
          .reduce((sum, order) => sum + order.amount, 0);
        const revenueB = OrderModel.getOrdersByCourse(b.id)
          .filter((order) => order.status === "completed")
          .reduce((sum, order) => sum + order.amount, 0);
        return revenueB - revenueA;
      }
      return 0;
    });

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

  getCreateCourseForm: (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.redirect("/login");
    }

    res.render("instructor/course-form", {
      course: null,
      isEdit: false,
    });
  },

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
        CourseModel.updateCourse(courseId, {
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

  addModule: (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const courseId = req.params.id;
    const instructorId = req.session.user.id;
    const { title } = req.body;

    try {
      const course = CourseModel.getCourseById(courseId);

      if (!course || course.instructorId !== instructorId) {
        return res.status(403).json({
          success: false, 
          message: "Course not found or you do not have permission to edit it"
        });
      }

      const newModule = CourseModel.addModuleToCourse(courseId, { title });

      // Return JSON response for Ajax requests
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.json({
          success: true,
          message: "Module added successfully",
          module: newModule
        });
      }

      // Otherwise use regular redirect with flash message
      req.flash("success_msg", "Module added successfully");
      res.redirect(`/instructor/courses/${courseId}/content`);
    } catch (error) {
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(500).json({
          success: false,
          message: error.message
        });
      }
      
      req.flash("error_msg", error.message);
      res.redirect(`/instructor/courses/${courseId}/content`);
    }
  },

  updateModule: (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const { id: courseId, moduleId } = req.params;
    const instructorId = req.session.user.id;
    const { title } = req.body;

    try {
      const course = CourseModel.getCourseById(courseId);

      if (!course || course.instructorId !== instructorId) {
        return res.status(403).json({
          success: false,
          message: "Course not found or you do not have permission to edit it"
        });
      }

      const moduleIndex = course.modules.findIndex((m) => m.id === moduleId);

      if (moduleIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Module not found"
        });
      }

      course.modules[moduleIndex].title = title;
      course.updatedAt = new Date().toISOString();

      CourseModel.updateCourse(courseId, { modules: course.modules });

      // Return JSON response for Ajax requests
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.json({
          success: true,
          message: "Module updated successfully",
          module: course.modules[moduleIndex]
        });
      }

      // Otherwise use regular redirect with flash message
      req.flash("success_msg", "Module updated successfully");
      res.redirect(`/instructor/courses/${courseId}/content`);
    } catch (error) {
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(500).json({
          success: false,
          message: error.message
        });
      }
      req.flash("error_msg", error.message);
      res.redirect(`/instructor/courses/${courseId}/content`);
    }
  },

  deleteModule: (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const { id: courseId, moduleId } = req.params;
    const instructorId = req.session.user.id;

    try {
      const course = CourseModel.getCourseById(courseId);

      if (!course || course.instructorId !== instructorId) {
        return res.status(403).json({
          success: false,
          message: "Course not found or you do not have permission to edit it"
        });
      }

      const moduleIndex = course.modules.findIndex((m) => m.id === moduleId);

      if (moduleIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Module not found"
        });
      }

      // Store the module before removing it
      const deletedModule = course.modules[moduleIndex];
      
      // Remove the module
      course.modules.splice(moduleIndex, 1);
      course.updatedAt = new Date().toISOString();

      CourseModel.updateCourse(courseId, { modules: course.modules });

      // Return JSON response for Ajax requests
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.json({
          success: true,
          message: "Module deleted successfully",
          moduleId: deletedModule.id
        });
      }

      // Otherwise use regular redirect with flash message
      req.flash("success_msg", "Module deleted successfully");
      res.redirect(`/instructor/courses/${courseId}/content`);
    } catch (error) {
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(500).json({
          success: false,
          message: error.message
        });
      }
      
      // Make sure to set the error flash message for non-Ajax requests
      req.flash("error_msg", error.message);
      res.redirect(`/instructor/courses/${courseId}/content`);
    }
  },

  addLesson: (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const { courseId, moduleId } = req.params;
    const instructorId = req.session.user.id;

    upload.single("file")(req, res, (err) => {
      if (err) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
          return res.status(400).json({
            success: false,
            message: "Error uploading file"
          });
        }
        req.flash("error_msg", "Error uploading file");
        return res.redirect(`/instructor/courses/${courseId}/content`);
      }

      const { title, type, duration } = req.body;

      try {
        const course = CourseModel.getCourseById(courseId);

        if (!course || course.instructorId !== instructorId) {
          if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(403).json({
              success: false,
              message: "Course not found or you do not have permission to edit it"
            });
          }
          req.flash("error_msg", "Course not found or you do not have permission to edit it");
          return res.redirect("/instructor/courses");
        }

        const moduleIndex = course.modules.findIndex((m) => m.id === moduleId);

        if (moduleIndex === -1) {
          if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(404).json({
              success: false,
              message: "Module not found"
            });
          }
          req.flash("error_msg", "Module not found");
          return res.redirect(`/instructor/courses/${courseId}/content`);
        }

        const newLesson = {
          id: Date.now().toString(),
          title,
          type,
          duration: duration || "",
          file: req.file ? `/uploads/${req.file.filename}` : null,
        };

        course.modules[moduleIndex].lessons.push(newLesson);
        course.updatedAt = new Date().toISOString();

        CourseModel.updateCourse(courseId, { modules: course.modules });

        // Return JSON response for Ajax requests
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
          return res.json({
            success: true,
            message: "Lesson added successfully",
            lesson: newLesson
          });
        }

        // Otherwise use regular redirect with flash message
        req.flash("success_msg", "Lesson added successfully");
        res.redirect(`/instructor/courses/${courseId}/content`);
      } catch (error) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
          return res.status(500).json({
            success: false,
            message: error.message
          });
        }
        req.flash("error_msg", error.message);
        res.redirect(`/instructor/courses/${courseId}/content`);
      }
    });
  },

  updateLesson: (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const { id: courseId, moduleId, lessonId } = req.params;
    const instructorId = req.session.user.id;

    upload.single("file")(req, res, (err) => {
      if (err) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
          return res.status(400).json({
            success: false,
            message: "Error uploading file"
          });
        }
        req.flash("error_msg", "Error uploading file");
        return res.redirect(`/instructor/courses/${courseId}/content`);
      }

      const { title, type, duration } = req.body;

      try {
        const course = CourseModel.getCourseById(courseId);

        if (!course || course.instructorId !== instructorId) {
          if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(403).json({
              success: false,
              message: "Course not found or you do not have permission to edit it"
            });
          }
          req.flash("error_msg", "Course not found or you do not have permission to edit it");
          return res.redirect("/instructor/courses");
        }

        const moduleIndex = course.modules.findIndex((m) => m.id === moduleId);

        if (moduleIndex === -1) {
          if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(404).json({
              success: false,
              message: "Module not found"
            });
          }
          req.flash("error_msg", "Module not found");
          return res.redirect(`/instructor/courses/${courseId}/content`);
        }

        const lessonIndex = course.modules[moduleIndex].lessons.findIndex(
          (l) => l.id === lessonId
        );

        if (lessonIndex === -1) {
          if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(404).json({
              success: false,
              message: "Lesson not found"
            });
          }
          req.flash("error_msg", "Lesson not found");
          return res.redirect(`/instructor/courses/${courseId}/content`);
        }

        const updatedLesson = {
          ...course.modules[moduleIndex].lessons[lessonIndex],
          title,
          type,
          duration: duration || "",
          file: req.file
            ? `/uploads/${req.file.filename}`
            : course.modules[moduleIndex].lessons[lessonIndex].file,
        };

        course.modules[moduleIndex].lessons[lessonIndex] = updatedLesson;
        course.updatedAt = new Date().toISOString();

        CourseModel.updateCourse(courseId, { modules: course.modules });

        // Return JSON response for Ajax requests
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
          return res.json({
            success: true,
            message: "Lesson updated successfully",
            lesson: updatedLesson
          });
        }

        // Otherwise use regular redirect with flash message
        req.flash("success_msg", "Lesson updated successfully");
        res.redirect(`/instructor/courses/${courseId}/content`);
      } catch (error) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
          return res.status(500).json({
            success: false,
            message: error.message
          });
        }
        req.flash("error_msg", error.message);
        res.redirect(`/instructor/courses/${courseId}/content`);
      }
    });
  },

  deleteLesson: (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const { id: courseId, moduleId, lessonId } = req.params;
    const instructorId = req.session.user.id;

    try {
      const course = CourseModel.getCourseById(courseId);

      if (!course || course.instructorId !== instructorId) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
          return res.status(403).json({
            success: false,
            message: "Course not found or you do not have permission to edit it"
          });
        }
        req.flash("error_msg", "Course not found or you do not have permission to edit it");
        return res.redirect("/instructor/courses");
      }

      const moduleIndex = course.modules.findIndex((m) => m.id === moduleId);

      if (moduleIndex === -1) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
          return res.status(404).json({
            success: false,
            message: "Module not found"
          });
        }
        req.flash("error_msg", "Module not found");
        return res.redirect(`/instructor/courses/${courseId}/content`);
      }

      const lessonIndex = course.modules[moduleIndex].lessons.findIndex(
        (l) => l.id === lessonId
      );

      if (lessonIndex === -1) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
          return res.status(404).json({
            success: false,
            message: "Lesson not found"
          });
        }
        req.flash("error_msg", "Lesson not found");
        return res.redirect(`/instructor/courses/${courseId}/content`);
      }

      // Store the lesson before removing it
      const deletedLesson = course.modules[moduleIndex].lessons[lessonIndex];

      // Remove the lesson
      course.modules[moduleIndex].lessons.splice(lessonIndex, 1);
      course.updatedAt = new Date().toISOString();

      CourseModel.updateCourse(courseId, { modules: course.modules });

      // Return JSON response for Ajax requests
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.json({
          success: true,
          message: "Lesson deleted successfully",
          lessonId: deletedLesson.id
        });
      }

      // Otherwise use regular redirect with flash message
      req.flash("success_msg", "Lesson deleted successfully");
      res.redirect(`/instructor/courses/${courseId}/content`);
    } catch (error) {
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(500).json({
          success: false,
          message: error.message
        });
      }
      req.flash("error_msg", error.message);
      res.redirect(`/instructor/courses/${courseId}/content`);
    }
  },

  getInstructorAnalytics: (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.redirect("/login");
    }

    const userId = req.session.user.id;
    const instructorCourses = CourseModel.getCoursesByInstructor(userId);

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

  getInstructorStudents: (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.redirect("/login");
    }

    const userId = req.session.user.id;
    const instructorCourses = CourseModel.getCoursesByInstructor(userId);
    const courseIds = instructorCourses.map((course) => String(course.id));

    // Get all students enrolled in instructor's courses
    const allUsers = UserModel.getAllUsers();
    const students = allUsers.filter(
      (user) =>
        user.role === "student" &&
        user.enrolledCourses.some((courseId) => courseIds.includes(String(courseId)))
    );

    // Enhance students with course info
    const enhancedStudents = students.map((student) => {
      const enrolledInstructorCourses = student.enrolledCourses
        .filter((courseId) => courseIds.includes(String(courseId)))
        .map((courseId) => {
          const course = CourseModel.getCourseById(courseId);
          const progress = ProgressModel.getProgress(student.id, courseId) || { progress: 0 };
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
      courses: instructorCourses,
    });
  },
};

module.exports = InstructorController;