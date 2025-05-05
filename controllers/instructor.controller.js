const Course = require("../models/course.model"); // Assuming Mongoose Course model
const User = require("../models/User"); // Assuming Mongoose User model
const Order = require("../models/order.model"); // Assuming Mongoose Order model
const Progress = require("../models/progress.model"); // Assuming Mongoose Progress model
const AdminController = require("./admin.controller"); // Import AdminController for validating ObjectId
const path = require("path");
const multer = require("multer");
const fs = require("fs");

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
  getInstructorDashboard: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.redirect("/login");
    }

    try {
      const userId = req.session.user.id;
      const instructorCourses = await Course.getCoursesByInstructor(userId);
      const courseIds = instructorCourses.map((course) => course._id);

      const totalStudents = await User.countDocuments({
        enrolledCourses: { $in: courseIds },
      });

      const allOrders = await Order.getAllOrders();
      const completedOrders = allOrders.filter(
        (order) =>
          courseIds.some((id) => id.equals(order.courseId)) &&
          order.status === "completed"
      );
      const totalRevenue = completedOrders.reduce(
        (sum, order) => sum + order.amount,
        0
      );

      const recentOrdersRaw = await Order.getRecentOrders(20);
      let recentOrders = recentOrdersRaw
        .filter((order) => courseIds.some((id) => id.equals(order.courseId)))
        .slice(0, 5);

      // Enhance orders with user and course information
      const enhancedOrdersPromises = recentOrders.map(async (order) => {
        let user = null;
        if (order.userId) {
          // Use direct MongoDB ObjectId comparison instead of string conversion
          try {
            user = await User.findById(order.userId);
          } catch (err) {
            console.error("Error finding user:", err);
          }
        }

        let course = await Course.getCourseById(order.courseId);

        return {
          ...order,
          // Use the username or email from the user model - these are the fields that actually exist
          username: user
            ? user.username || user.email || "Unknown User"
            : "Unknown User",
          courseTitle: course ? course.title : "Unknown Course",
        };
      });

      recentOrders = await Promise.all(enhancedOrdersPromises);

      res.render("instructor/dashboard", {
        courses: instructorCourses,
        totalStudents,
        totalRevenue,
        recentOrders,
      });
    } catch (error) {
      console.error("Instructor Dashboard error:", error);
      req.flash("error_msg", "Could not load dashboard.");
      res.redirect("/");
    }
  },

  getInstructorCourses: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.redirect("/login");
    }

    try {
      const userId = req.session.user.id;
      const sortFilter = req.query.sort || "newest";

      // Fetch courses via native model and sort in JS
      let instructorCourses = await Course.getCoursesByInstructor(userId);
      // Apply sorting filter
      switch (sortFilter) {
        case "oldest":
          instructorCourses.sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
          );
          break;
        case "title-asc":
          instructorCourses.sort((a, b) => a.title.localeCompare(b.title));
          break;
        case "title-desc":
          instructorCourses.sort((a, b) => b.title.localeCompare(a.title));
          break;
        default:
          instructorCourses.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );
      }

      const enhancedCoursesPromises = instructorCourses.map(async (course) => {
        const studentCount = await User.countDocuments({
          enrolledCourses: course._id,
        });
        // Get all orders and filter for this course
        const allOrders = await Order.getAllOrders();
        const courseOrders = allOrders.filter(
          (order) =>
            order.courseId.toString() === course._id.toString() &&
            order.status === "completed"
        );
        const revenue = courseOrders.reduce(
          (sum, order) => sum + order.amount,
          0
        );
        return {
          ...course, // Native MongoDB objects don't need toObject()
          studentCount,
          revenue,
        };
      });

      let enhancedCourses = await Promise.all(enhancedCoursesPromises);

      if (sortFilter === "students") {
        enhancedCourses.sort((a, b) => b.studentCount - a.studentCount);
      } else if (sortFilter === "revenue") {
        enhancedCourses.sort((a, b) => b.revenue - a.revenue);
      }

      res.render("instructor/courses", {
        courses: enhancedCourses,
        sort: sortFilter,
      });
    } catch (error) {
      console.error("Get Instructor Courses error:", error);
      req.flash("error_msg", "Could not load courses.");
      res.redirect("/instructor/dashboard");
    }
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

    upload.single("thumbnail")(req, res, async (err) => {
      if (err) {
        req.flash("error_msg", "Error uploading file: " + err.message);
        return res.redirect("/instructor/courses/new");
      }

      const { title, description, category, price, language } = req.body;
      const instructorId = req.session.user.id;

      try {
        const newCourseData = {
          title,
          description,
          category,
          language: language || "English",
          price: Number.parseFloat(price) || 0,
          instructorId,
          thumbnail: req.file
            ? `/uploads/${req.file.filename}`
            : "/img/course-placeholder.jpg",
          createdAt: new Date(),
          updatedAt: new Date(),
          modules: [],
          status: "draft",
        };

        const newCourse = await Course.createCourse(newCourseData);

        req.flash(
          "success_msg",
          "Course created successfully. Add content now."
        );
        res.redirect(`/instructor/courses/${newCourse._id}/content`);
      } catch (error) {
        console.error("Create Course error:", error);
        req.flash("error_msg", error.message || "Error creating course");
        res.redirect("/instructor/courses/new");
      }
    });
  },

  getEditCourseForm: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.redirect("/login");
    }

    try {
      const courseId = req.params.id;
      const instructorId = req.session.user.id;
      const course = await Course.getCourseById(courseId);

      if (!course || course.instructorId.toString() !== instructorId) {
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
    } catch (error) {
      console.error("Get Edit Course Form error:", error);
      req.flash("error_msg", "Could not load course editor.");
      res.redirect("/instructor/courses");
    }
  },

  updateCourse: (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.redirect("/login");
    }

    const courseId = req.params.id;
    const instructorId = req.session.user.id;

    upload.single("thumbnail")(req, res, async (err) => {
      if (err) {
        req.flash("error_msg", "Error uploading file: " + err.message);
        return res.redirect(`/instructor/courses/${courseId}/edit`);
      }

      const { title, description, category, price, language, status } =
        req.body;

      try {
        const course = await Course.getCourseById(courseId);

        if (!course || course.instructorId.toString() !== instructorId) {
          req.flash(
            "error_msg",
            "Course not found or you do not have permission to edit it"
          );
          return res.redirect("/instructor/courses");
        }

        const updates = {
          title,
          description,
          category,
          language: language || course.language || "English",
          price: Number.parseFloat(price) || 0,
          status: status || course.status,
          updatedAt: new Date(),
        };

        if (req.file) {
          updates.thumbnail = `/uploads/${req.file.filename}`;
        }

        await Course.updateCourse(courseId, updates);

        req.flash("success_msg", "Course updated successfully");
        res.redirect("/instructor/courses");
      } catch (error) {
        console.error("Update Course error:", error);
        req.flash("error_msg", error.message || "Error updating course");
        res.redirect(`/instructor/courses/${courseId}/edit`);
      }
    });
  },

  getCourseContentPage: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.redirect("/login");
    }

    try {
      const courseId = req.params.id;
      const instructorId = req.session.user.id;
      const course = await Course.getCourseById(courseId);

      if (!course || course.instructorId.toString() !== instructorId) {
        req.flash(
          "error_msg",
          "Course not found or you do not have permission to manage its content"
        );
        return res.redirect("/instructor/courses");
      }

      res.render("instructor/course-content", {
        course,
      });
    } catch (error) {
      console.error("Get Course Content Page error:", error);
      req.flash("error_msg", "Could not load course content editor.");
      res.redirect("/instructor/courses");
    }
  },

  addModule: async (req, res) => {
    console.log("--- addModule Controller ---"); // Added log
    console.log("Request Body:", req.body); // Added log
    console.log("Course ID Param:", req.params.id); // Added log
    if (!req.session.user || req.session.user.role !== "instructor") {
      console.log("Unauthorized access attempt."); // Added log
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const courseId = req.params.id;
    const instructorId = req.session.user.id;
    const { title } = req.body;

    if (!title || title.trim() === "") {
      // Added check for empty title
      console.log("Module title is missing or empty.");
      const errorMsg = "Module title cannot be empty.";
      if (req.xhr || req.headers.accept.includes("json")) {
        return res.status(400).json({ success: false, message: errorMsg });
      }
      req.flash("error_msg", errorMsg);
      return res.redirect(`/instructor/courses/${courseId}/content`);
    }

    try {
      console.log(`Fetching course with ID: ${courseId}`); // Added log
      const course = await Course.getCourseById(courseId);

      if (!course) {
        // Added specific log for course not found
        console.log(`Course not found for ID: ${courseId}`);
        return res
          .status(404)
          .json({ success: false, message: "Course not found" });
      }

      if (course.instructorId.toString() !== instructorId) {
        console.log(
          `Permission denied: Instructor ${instructorId} does not own course ${courseId}`
        ); // Added log
        return res
          .status(403)
          .json({ success: false, message: "Permission denied" });
      }

      console.log(
        `Calling Course.addModuleToCourse for course ${courseId} with title "${title}"`
      ); // Added log
      // Use the native model method to add a module
      const newModule = await Course.addModuleToCourse(courseId, {
        title: title,
      });
      console.log("Module added successfully via model:", newModule); // Added log

      if (req.xhr || req.headers.accept.includes("json")) {
        console.log("Responding with JSON success."); // Added log
        return res.json({
          success: true,
          message: "Module added",
          module: newModule,
        });
      }
      req.flash("success_msg", "Module added successfully");
      res.redirect(`/instructor/courses/${courseId}/content`);
    } catch (error) {
      console.error("Add Module error in controller:", error); // Enhanced log
      const errorMsg = error.message || "Error adding module";
      if (req.xhr || req.headers.accept.includes("json")) {
        console.log("Responding with JSON error."); // Added log
        return res.status(500).json({ success: false, message: errorMsg });
      }
      req.flash("error_msg", errorMsg);
      res.redirect(`/instructor/courses/${courseId}/content`);
    }
  },

  updateModule: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { id: courseId, moduleId } = req.params;
    const instructorId = req.session.user.id;
    const { title } = req.body;

    try {
      const course = await Course.getCourseById(courseId);

      if (!course || course.instructorId.toString() !== instructorId) {
        return res.status(403).json({
          success: false,
          message: "Course not found or permission denied",
        });
      }

      // Find the module in the course
      const moduleIndex = course.modules.findIndex(
        (mod) => mod._id.toString() === moduleId
      );
      if (moduleIndex === -1) {
        return res
          .status(404)
          .json({ success: false, message: "Module not found" });
      }

      // Update the course with modified module using updateCourse
      const updatedModules = [...course.modules];
      updatedModules[moduleIndex].title = title;
      await Course.updateCourse(courseId, {
        modules: updatedModules,
        updatedAt: new Date(),
      });

      // Return the updated module
      const updatedModule = updatedModules[moduleIndex];

      if (req.xhr || req.headers.accept.includes("json")) {
        return res.json({
          success: true,
          message: "Module updated",
          module: updatedModule,
        });
      }
      req.flash("success_msg", "Module updated successfully");
      res.redirect(`/instructor/courses/${courseId}/content`);
    } catch (error) {
      console.error("Update Module error:", error);
      const errorMsg = error.message || "Error updating module";
      if (req.xhr || req.headers.accept.includes("json")) {
        return res.status(500).json({ success: false, message: errorMsg });
      }
      req.flash("error_msg", errorMsg);
      res.redirect(`/instructor/courses/${courseId}/content`);
    }
  },

  deleteModule: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { id: courseId, moduleId } = req.params;
    const instructorId = req.session.user.id;

    try {
      const course = await Course.getCourseById(courseId);

      if (!course || course.instructorId.toString() !== instructorId) {
        return res.status(403).json({
          success: false,
          message: "Course not found or permission denied",
        });
      }

      // Find the module index in the modules array
      const moduleIndex = course.modules.findIndex(
        (mod) => mod._id.toString() === moduleId
      );
      if (moduleIndex === -1) {
        return res
          .status(404)
          .json({ success: false, message: "Module not found" });
      }

      // Remove the module from the array and update the course
      const updatedModules = [...course.modules];
      updatedModules.splice(moduleIndex, 1);
      await Course.updateCourse(courseId, {
        modules: updatedModules,
        updatedAt: new Date(),
      });

      if (req.xhr || req.headers.accept.includes("json")) {
        return res.json({
          success: true,
          message: "Module deleted",
          moduleId: moduleId,
        });
      }
      req.flash("success_msg", "Module deleted successfully");
      res.redirect(`/instructor/courses/${courseId}/content`);
    } catch (error) {
      console.error("Delete Module error:", error);
      const errorMsg = error.message || "Error deleting module";
      if (req.xhr || req.headers.accept.includes("json")) {
        return res.status(500).json({ success: false, message: errorMsg });
      }
      req.flash("error_msg", errorMsg);
      res.redirect(`/instructor/courses/${courseId}/content`);
    }
  },

  addLesson: (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { courseId, moduleId } = req.params;
    const instructorId = req.session.user.id;

    upload.single("file")(req, res, async (err) => {
      if (err) {
        const errorMsg = "Error uploading file: " + err.message;
        if (req.xhr || req.headers.accept.includes("json")) {
          return res.status(400).json({ success: false, message: errorMsg });
        }
        req.flash("error_msg", errorMsg);
        return res.redirect(`/instructor/courses/${courseId}/content`);
      }

      const { title, type, duration } = req.body;

      try {
        const course = await Course.getCourseById(courseId);

        if (!course || course.instructorId.toString() !== instructorId) {
          const errorMsg = "Course not found or permission denied";
          if (req.xhr || req.headers.accept.includes("json")) {
            return res.status(403).json({ success: false, message: errorMsg });
          }
          req.flash("error_msg", errorMsg);
          return res.redirect("/instructor/courses");
        }

        // Find the module in the course
        const moduleIndex = course.modules.findIndex(
          (mod) => mod._id.toString() === moduleId
        );
        if (moduleIndex === -1) {
          const errorMsg = "Module not found";
          if (req.xhr || req.headers.accept.includes("json")) {
            return res.status(404).json({ success: false, message: errorMsg });
          }
          req.flash("error_msg", errorMsg);
          return res.redirect(`/instructor/courses/${courseId}/content`);
        }

        const newLesson = {
          title,
          type,
          duration: duration || "",
          file: req.file ? `/uploads/${req.file.filename}` : null,
        };

        // Use the native model method to add a lesson to module
        const addedLesson = await Course.addLessonToModule(
          courseId,
          moduleId,
          newLesson
        );

        if (req.xhr || req.headers.accept.includes("json")) {
          return res.json({
            success: true,
            message: "Lesson added",
            lesson: addedLesson,
          });
        }
        req.flash("success_msg", "Lesson added successfully");
        res.redirect(`/instructor/courses/${courseId}/content`);
      } catch (error) {
        console.error("Add Lesson error:", error);
        const errorMsg = error.message || "Error adding lesson";
        if (req.xhr || req.headers.accept.includes("json")) {
          return res.status(500).json({ success: false, message: errorMsg });
        }
        req.flash("error_msg", errorMsg);
        res.redirect(`/instructor/courses/${courseId}/content`);
      }
    });
  },

  updateLesson: (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { id: courseId, moduleId, lessonId } = req.params;
    const instructorId = req.session.user.id;

    upload.single("file")(req, res, async (err) => {
      if (err) {
        const errorMsg = "Error uploading file: " + err.message;
        if (req.xhr || req.headers.accept.includes("json")) {
          return res.status(400).json({ success: false, message: errorMsg });
        }
        req.flash("error_msg", errorMsg);
        return res.redirect(`/instructor/courses/${courseId}/content`);
      }

      const { title, type, duration } = req.body;

      try {
        const course = await Course.getCourseById(courseId);

        if (!course || course.instructorId.toString() !== instructorId) {
          const errorMsg = "Course not found or permission denied";
          if (req.xhr || req.headers.accept.includes("json")) {
            return res.status(403).json({ success: false, message: errorMsg });
          }
          req.flash("error_msg", errorMsg);
          return res.redirect("/instructor/courses");
        }

        // Find the module in the course
        const moduleIndex = course.modules.findIndex(
          (mod) => mod._id.toString() === moduleId
        );
        const module = moduleIndex !== -1 ? course.modules[moduleIndex] : null;
        if (!module) {
          const errorMsg = "Module not found";
          if (req.xhr || req.headers.accept.includes("json")) {
            return res.status(404).json({ success: false, message: errorMsg });
          }
          req.flash("error_msg", errorMsg);
          return res.redirect(`/instructor/courses/${courseId}/content`);
        }

        // Find the lesson in the module
        const lessonIndex = module.lessons.findIndex(
          (les) => les._id.toString() === lessonId
        );
        const lesson = lessonIndex !== -1 ? module.lessons[lessonIndex] : null;
        if (!lesson) {
          const errorMsg = "Lesson not found";
          if (req.xhr || req.headers.accept.includes("json")) {
            return res.status(404).json({ success: false, message: errorMsg });
          }
          req.flash("error_msg", errorMsg);
          return res.redirect(`/instructor/courses/${courseId}/content`);
        }

        // Create updated modules array with the modified lesson
        const updatedModules = [...course.modules];
        const updatedLesson = {
          ...updatedModules[moduleIndex].lessons[lessonIndex],
          title,
          type,
          duration: duration || "",
        };
        if (req.file) {
          updatedLesson.file = `/uploads/${req.file.filename}`;
        }

        // Replace the lesson in the modules structure
        updatedModules[moduleIndex].lessons[lessonIndex] = updatedLesson;

        // Update the course with the modified modules array
        await Course.updateCourse(courseId, {
          modules: updatedModules,
          updatedAt: new Date(),
        });

        if (req.xhr || req.headers.accept.includes("json")) {
          return res.json({
            success: true,
            message: "Lesson updated",
            lesson: updatedLesson,
          });
        }
        req.flash("success_msg", "Lesson updated successfully");
        res.redirect(`/instructor/courses/${courseId}/content`);
      } catch (error) {
        console.error("Update Lesson error:", error);
        const errorMsg = error.message || "Error updating lesson";
        if (req.xhr || req.headers.accept.includes("json")) {
          return res.status(500).json({ success: false, message: errorMsg });
        }
        req.flash("error_msg", errorMsg);
        res.redirect(`/instructor/courses/${courseId}/content`);
      }
    });
  },

  deleteLesson: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { id: courseId, moduleId, lessonId } = req.params;
    const instructorId = req.session.user.id;

    try {
      const course = await Course.getCourseById(courseId);

      if (!course || course.instructorId.toString() !== instructorId) {
        const errorMsg = "Course not found or permission denied";
        if (req.xhr || req.headers.accept.includes("json")) {
          return res.status(403).json({ success: false, message: errorMsg });
        }
        req.flash("error_msg", errorMsg);
        return res.redirect("/instructor/courses");
      }

      // Find the module in the course
      const moduleIndex = course.modules.findIndex(
        (mod) => mod._id.toString() === moduleId
      );
      const module = moduleIndex !== -1 ? course.modules[moduleIndex] : null;
      if (!module) {
        const errorMsg = "Module not found";
        if (req.xhr || req.headers.accept.includes("json")) {
          return res.status(404).json({ success: false, message: errorMsg });
        }
        req.flash("error_msg", errorMsg);
        return res.redirect(`/instructor/courses/${courseId}/content`);
      }
      // Find the lesson in the module
      const lessonIndex = module.lessons.findIndex(
        (les) => les._id.toString() === lessonId
      );
      const lesson = lessonIndex !== -1 ? module.lessons[lessonIndex] : null;
      if (!lesson) {
        const errorMsg = "Lesson not found";
        if (req.xhr || req.headers.accept.includes("json")) {
          return res.status(404).json({ success: false, message: errorMsg });
        }
        req.flash("error_msg", errorMsg);
        return res.redirect(`/instructor/courses/${courseId}/content`);
      }

      // Create a new modules array without the lesson to be deleted
      const updatedModules = [...course.modules];
      updatedModules[moduleIndex].lessons.splice(lessonIndex, 1);

      // Update the course with the modified modules array
      await Course.updateCourse(courseId, {
        modules: updatedModules,
        updatedAt: new Date(),
      });

      if (req.xhr || req.headers.accept.includes("json")) {
        return res.json({
          success: true,
          message: "Lesson deleted",
          lessonId: lessonId,
        });
      }
      req.flash("success_msg", "Lesson deleted successfully");
      res.redirect(`/instructor/courses/${courseId}/content`);
    } catch (error) {
      console.error("Delete Lesson error:", error);
      const errorMsg = error.message || "Error deleting lesson";
      if (req.xhr || req.headers.accept.includes("json")) {
        return res.status(500).json({ success: false, message: errorMsg });
      }
      req.flash("error_msg", errorMsg);
      res.redirect(`/instructor/courses/${courseId}/content`);
    }
  },

  getInstructorAnalytics: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.redirect("/login");
    }

    try {
      const userId = req.session.user.id;
      const instructorCourses = await Course.getCoursesByInstructor(userId);
      const courseIds = instructorCourses.map((c) => c._id);

      // Get all orders and filter for instructor's completed courses
      const allOrders = await Order.getAllOrders();
      const orders = allOrders.filter(
        (order) =>
          courseIds.some((id) => id.toString() === order.courseId.toString()) &&
          order.status === "completed"
      );

      const revenueByCourseName = {};
      let totalRevenue = 0;

      instructorCourses.forEach((course) => {
        const courseOrders = orders.filter((order) =>
          order.courseId.equals(course._id)
        );
        const courseRevenue = courseOrders.reduce(
          (sum, order) => sum + order.amount,
          0
        );
        revenueByCourseName[course.title] = courseRevenue;
        totalRevenue += courseRevenue;
      });

      // We need to use the Progress model's native methods instead of Mongoose's
      const allProgress = [];
      for (const courseId of courseIds) {
        // Get course completion rate for each course
        const courseProgress = await Progress.getCourseCompletionRate(courseId);
        allProgress.push({
          courseId: courseId,
          progress: courseProgress,
        });
      }

      const courseCompletionRates = instructorCourses.map((course) => {
        const completionRate =
          allProgress.find(
            (p) => p.courseId.toString() === course._id.toString()
          )?.progress || 0;
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
    } catch (error) {
      console.error("Instructor Analytics error:", error);
      req.flash("error_msg", "Could not load analytics.");
      res.redirect("/instructor/dashboard");
    }
  },

  getInstructorStudents: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.redirect("/login");
    }

    try {
      const userId = req.session.user.id;
      const instructorCourses = await Course.getCoursesByInstructor(userId);
      const courseIds = instructorCourses.map((course) => course._id);

      const students = await User.find({
        role: "student",
        enrolledCourses: { $in: courseIds },
      }).populate("enrolledCourses");

      const progressRecords = await Progress.find({
        userId: { $in: students.map((s) => s._id) },
        courseId: { $in: courseIds },
      });

      const enhancedStudents = students.map((student) => {
        const enrolledInstructorCourses = student.enrolledCourses
          .filter((course) => courseIds.some((id) => id.equals(course._id)))
          .map((course) => {
            const progress = progressRecords.find(
              (p) =>
                p.userId.equals(student._id) && p.courseId.equals(course._id)
            );
            return {
              ...course.toObject(),
              progress: progress ? progress.progress : 0,
            };
          });

        return {
          ...student.toObject(),
          courses: enrolledInstructorCourses,
        };
      });

      res.render("instructor/students", {
        students: enhancedStudents,
        courses: instructorCourses,
      });
    } catch (error) {
      console.error("Instructor Students error:", error);
      req.flash("error_msg", "Could not load student list.");
      res.redirect("/instructor/dashboard");
    }
  },

  getCourseRatings: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.redirect("/login");
    }

    try {
      const courseId = req.params.id;
      const instructorId = req.session.user.id;

      // Get course details
      const course = await Course.getCourseById(courseId);

      // Verify course exists and belongs to this instructor
      if (!course || course.instructorId.toString() !== instructorId) {
        req.flash(
          "error_msg",
          "Course not found or you don't have permission to access it"
        );
        return res.redirect("/instructor/courses");
      }

      // Import the rating model
      const RatingModel = require("../models/rating.model");

      // Get all ratings for this course
      const ratings = await RatingModel.getCourseRatings(courseId);

      // Get rating statistics
      const ratingStats = calculateRatingStats(ratings);

      res.render("instructor/course-ratings", {
        course,
        ratings,
        ratingStats,
        success_msg: req.flash("success_msg"),
        error_msg: req.flash("error_msg"),
      });
    } catch (error) {
      console.error("Get Course Ratings error:", error);
      req.flash("error_msg", "Failed to retrieve course ratings");
      res.redirect("/instructor/courses");
    }
  },
};

// Helper function to calculate rating statistics
function calculateRatingStats(ratings) {
  if (!ratings || ratings.length === 0) {
    return {
      average: 0,
      total: 0,
      distribution: {
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0,
      },
      percentages: {
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0,
      },
    };
  }

  // Initialize counters for each star rating
  const distribution = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };

  // Count ratings for each star level
  ratings.forEach((rating) => {
    if (rating.rating >= 1 && rating.rating <= 5) {
      distribution[Math.floor(rating.rating)]++;
    }
  });

  // Calculate average rating
  const totalRating = ratings.reduce((sum, rating) => sum + rating.rating, 0);
  const average = totalRating / ratings.length;

  // Calculate percentages
  const percentages = {};
  for (const stars in distribution) {
    percentages[stars] = (distribution[stars] / ratings.length) * 100;
  }

  return {
    average: average.toFixed(1),
    total: ratings.length,
    distribution,
    percentages,
  };
}

module.exports = InstructorController;
