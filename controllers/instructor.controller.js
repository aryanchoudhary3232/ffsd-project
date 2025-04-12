const Course = require("../models/course.model"); // Assuming Mongoose Course model
const User = require("../models/User"); // Assuming Mongoose User model
const Order = require("../models/order.model"); // Assuming Mongoose Order model
const Progress = require("../models/progress.model"); // Assuming Mongoose Progress model
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
  getInstructorDashboard: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.redirect("/login");
    }

    try {
      const userId = req.session.user.id;
      const instructorCourses = await Course.find({ instructorId: userId });
      const courseIds = instructorCourses.map(course => course._id);

      const totalStudents = await User.countDocuments({ enrolledCourses: { $in: courseIds } });

      const completedOrders = await Order.find({ courseId: { $in: courseIds }, status: "completed" });
      const totalRevenue = completedOrders.reduce((sum, order) => sum + order.amount, 0);

      const recentOrdersData = await Order.find({ courseId: { $in: courseIds } })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('userId', 'name')
        .populate('courseId', 'title');

      const recentOrders = recentOrdersData.map(order => ({
        ...order.toObject(),
        userName: order.userId ? order.userId.name : "Unknown User",
        courseTitle: order.courseId ? order.courseId.title : "Unknown Course",
      }));

      res.render("instructor/dashboard", {
        courses: instructorCourses,
        totalStudents,
        totalRevenue,
        recentOrders,
      });
    } catch (error) {
      console.error("Instructor Dashboard error:", error);
      req.flash("error_msg", "Could not load dashboard.");
      res.redirect('/');
    }
  },

  getInstructorCourses: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.redirect("/login");
    }

    try {
      const userId = req.session.user.id;
      const sortFilter = req.query.sort || "newest";
      let sortOption = { createdAt: -1 };

      switch (sortFilter) {
        case "oldest": sortOption = { createdAt: 1 }; break;
        case "title-asc": sortOption = { title: 1 }; break;
        case "title-desc": sortOption = { title: -1 }; break;
      }

      let instructorCourses = await Course.find({ instructorId: userId }).sort(sortOption);

      const enhancedCoursesPromises = instructorCourses.map(async (course) => {
        const studentCount = await User.countDocuments({ enrolledCourses: course._id });
        const courseOrders = await Order.find({ courseId: course._id, status: "completed" });
        const revenue = courseOrders.reduce((sum, order) => sum + order.amount, 0);
        return {
          ...course.toObject(),
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
        sort: sortFilter
      });
    } catch (error) {
      console.error("Get Instructor Courses error:", error);
      req.flash("error_msg", "Could not load courses.");
      res.redirect('/instructor/dashboard');
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

      const { title, description, category, price } = req.body;
      const instructorId = req.session.user.id;

      try {
        const newCourseData = {
          title,
          description,
          category,
          price: Number.parseFloat(price) || 0,
          instructorId,
          thumbnail: req.file
            ? `/uploads/${req.file.filename}`
            : "/img/course-placeholder.jpg",
          createdAt: new Date(),
          updatedAt: new Date(),
          modules: [],
          status: 'draft'
        };

        const newCourse = await Course.create(newCourseData);

        req.flash("success_msg", "Course created successfully. Add content now.");
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
      const course = await Course.findById(courseId);

      if (!course || !course.instructorId.equals(instructorId)) {
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

      const { title, description, category, price, status } = req.body;

      try {
        const course = await Course.findById(courseId);

        if (!course || !course.instructorId.equals(instructorId)) {
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
          price: Number.parseFloat(price) || 0,
          status: status || course.status,
          updatedAt: new Date()
        };

        if (req.file) {
          updates.thumbnail = `/uploads/${req.file.filename}`;
        }

        await Course.findByIdAndUpdate(courseId, updates);

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
      const course = await Course.findById(courseId);

      if (!course || !course.instructorId.equals(instructorId)) {
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
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const courseId = req.params.id;
    const instructorId = req.session.user.id;
    const { title } = req.body;

    try {
      const course = await Course.findById(courseId);

      if (!course || !course.instructorId.equals(instructorId)) {
        return res.status(403).json({ success: false, message: "Course not found or permission denied" });
      }

      const newModule = { title: title, lessons: [] };
      course.modules.push(newModule);
      course.updatedAt = new Date();
      await course.save();

      const addedModule = course.modules[course.modules.length - 1];

      if (req.xhr || req.headers.accept.includes('json')) {
        return res.json({ success: true, message: "Module added", module: addedModule });
      }
      req.flash("success_msg", "Module added successfully");
      res.redirect(`/instructor/courses/${courseId}/content`);
    } catch (error) {
      console.error("Add Module error:", error);
      const errorMsg = error.message || "Error adding module";
      if (req.xhr || req.headers.accept.includes('json')) {
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
      const course = await Course.findById(courseId);

      if (!course || !course.instructorId.equals(instructorId)) {
        return res.status(403).json({ success: false, message: "Course not found or permission denied" });
      }

      const module = course.modules.id(moduleId);
      if (!module) {
        return res.status(404).json({ success: false, message: "Module not found" });
      }

      module.title = title;
      course.updatedAt = new Date();
      await course.save();

      if (req.xhr || req.headers.accept.includes('json')) {
        return res.json({ success: true, message: "Module updated", module: module });
      }
      req.flash("success_msg", "Module updated successfully");
      res.redirect(`/instructor/courses/${courseId}/content`);
    } catch (error) {
      console.error("Update Module error:", error);
      const errorMsg = error.message || "Error updating module";
      if (req.xhr || req.headers.accept.includes('json')) {
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
      const course = await Course.findById(courseId);

      if (!course || !course.instructorId.equals(instructorId)) {
        return res.status(403).json({ success: false, message: "Course not found or permission denied" });
      }

      const module = course.modules.id(moduleId);
      if (!module) {
        return res.status(404).json({ success: false, message: "Module not found" });
      }
      module.remove();
      course.updatedAt = new Date();
      await course.save();

      if (req.xhr || req.headers.accept.includes('json')) {
        return res.json({ success: true, message: "Module deleted", moduleId: moduleId });
      }
      req.flash("success_msg", "Module deleted successfully");
      res.redirect(`/instructor/courses/${courseId}/content`);
    } catch (error) {
      console.error("Delete Module error:", error);
      const errorMsg = error.message || "Error deleting module";
      if (req.xhr || req.headers.accept.includes('json')) {
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
        if (req.xhr || req.headers.accept.includes('json')) {
          return res.status(400).json({ success: false, message: errorMsg });
        }
        req.flash("error_msg", errorMsg);
        return res.redirect(`/instructor/courses/${courseId}/content`);
      }

      const { title, type, duration } = req.body;

      try {
        const course = await Course.findById(courseId);

        if (!course || !course.instructorId.equals(instructorId)) {
          const errorMsg = "Course not found or permission denied";
          if (req.xhr || req.headers.accept.includes('json')) {
            return res.status(403).json({ success: false, message: errorMsg });
          }
          req.flash("error_msg", errorMsg);
          return res.redirect("/instructor/courses");
        }

        const module = course.modules.id(moduleId);
        if (!module) {
          const errorMsg = "Module not found";
          if (req.xhr || req.headers.accept.includes('json')) {
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
        module.lessons.push(newLesson);
        course.updatedAt = new Date();
        await course.save();

        const addedLesson = module.lessons[module.lessons.length - 1];

        if (req.xhr || req.headers.accept.includes('json')) {
          return res.json({ success: true, message: "Lesson added", lesson: addedLesson });
        }
        req.flash("success_msg", "Lesson added successfully");
        res.redirect(`/instructor/courses/${courseId}/content`);
      } catch (error) {
        console.error("Add Lesson error:", error);
        const errorMsg = error.message || "Error adding lesson";
        if (req.xhr || req.headers.accept.includes('json')) {
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
        if (req.xhr || req.headers.accept.includes('json')) {
          return res.status(400).json({ success: false, message: errorMsg });
        }
        req.flash("error_msg", errorMsg);
        return res.redirect(`/instructor/courses/${courseId}/content`);
      }

      const { title, type, duration } = req.body;

      try {
        const course = await Course.findById(courseId);

        if (!course || !course.instructorId.equals(instructorId)) {
          const errorMsg = "Course not found or permission denied";
          if (req.xhr || req.headers.accept.includes('json')) {
            return res.status(403).json({ success: false, message: errorMsg });
          }
          req.flash("error_msg", errorMsg);
          return res.redirect("/instructor/courses");
        }

        const module = course.modules.id(moduleId);
        if (!module) {
          const errorMsg = "Module not found";
          if (req.xhr || req.headers.accept.includes('json')) {
            return res.status(404).json({ success: false, message: errorMsg });
          }
          req.flash("error_msg", errorMsg);
          return res.redirect(`/instructor/courses/${courseId}/content`);
        }
        const lesson = module.lessons.id(lessonId);
        if (!lesson) {
          const errorMsg = "Lesson not found";
          if (req.xhr || req.headers.accept.includes('json')) {
            return res.status(404).json({ success: false, message: errorMsg });
          }
          req.flash("error_msg", errorMsg);
          return res.redirect(`/instructor/courses/${courseId}/content`);
        }

        lesson.title = title;
        lesson.type = type;
        lesson.duration = duration || "";
        if (req.file) {
          lesson.file = `/uploads/${req.file.filename}`;
        }
        course.updatedAt = new Date();
        await course.save();

        if (req.xhr || req.headers.accept.includes('json')) {
          return res.json({ success: true, message: "Lesson updated", lesson: lesson });
        }
        req.flash("success_msg", "Lesson updated successfully");
        res.redirect(`/instructor/courses/${courseId}/content`);
      } catch (error) {
        console.error("Update Lesson error:", error);
        const errorMsg = error.message || "Error updating lesson";
        if (req.xhr || req.headers.accept.includes('json')) {
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
      const course = await Course.findById(courseId);

      if (!course || !course.instructorId.equals(instructorId)) {
        const errorMsg = "Course not found or permission denied";
        if (req.xhr || req.headers.accept.includes('json')) {
          return res.status(403).json({ success: false, message: errorMsg });
        }
        req.flash("error_msg", errorMsg);
        return res.redirect("/instructor/courses");
      }

      const module = course.modules.id(moduleId);
      if (!module) {
        const errorMsg = "Module not found";
        if (req.xhr || req.headers.accept.includes('json')) {
          return res.status(404).json({ success: false, message: errorMsg });
        }
        req.flash("error_msg", errorMsg);
        return res.redirect(`/instructor/courses/${courseId}/content`);
      }
      const lesson = module.lessons.id(lessonId);
      if (!lesson) {
        const errorMsg = "Lesson not found";
        if (req.xhr || req.headers.accept.includes('json')) {
          return res.status(404).json({ success: false, message: errorMsg });
        }
        req.flash("error_msg", errorMsg);
        return res.redirect(`/instructor/courses/${courseId}/content`);
      }

      lesson.remove();
      course.updatedAt = new Date();
      await course.save();

      if (req.xhr || req.headers.accept.includes('json')) {
        return res.json({ success: true, message: "Lesson deleted", lessonId: lessonId });
      }
      req.flash("success_msg", "Lesson deleted successfully");
      res.redirect(`/instructor/courses/${courseId}/content`);
    } catch (error) {
      console.error("Delete Lesson error:", error);
      const errorMsg = error.message || "Error deleting lesson";
      if (req.xhr || req.headers.accept.includes('json')) {
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
      const instructorCourses = await Course.find({ instructorId: userId });
      const courseIds = instructorCourses.map(c => c._id);

      const orders = await Order.find({ courseId: { $in: courseIds }, status: 'completed' });
      const revenueByCourseName = {};
      let totalRevenue = 0;

      instructorCourses.forEach(course => {
        const courseOrders = orders.filter(order => order.courseId.equals(course._id));
        const courseRevenue = courseOrders.reduce((sum, order) => sum + order.amount, 0);
        revenueByCourseName[course.title] = courseRevenue;
        totalRevenue += courseRevenue;
      });

      const progressRecords = await Progress.find({ courseId: { $in: courseIds } });
      const courseCompletionRates = instructorCourses.map(course => {
        const courseProgress = progressRecords.filter(p => p.courseId.equals(course._id));
        const completedCount = courseProgress.filter(p => p.progress === 100).length;
        const totalEnrolled = courseProgress.length;
        const completionRate = totalEnrolled > 0 ? Math.round((completedCount / totalEnrolled) * 100) : 0;
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
      res.redirect('/instructor/dashboard');
    }
  },

  getInstructorStudents: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "instructor") {
      return res.redirect("/login");
    }

    try {
      const userId = req.session.user.id;
      const instructorCourses = await Course.find({ instructorId: userId });
      const courseIds = instructorCourses.map((course) => course._id);

      const students = await User.find({
        role: "student",
        enrolledCourses: { $in: courseIds }
      }).populate('enrolledCourses');

      const progressRecords = await Progress.find({
        userId: { $in: students.map(s => s._id) },
        courseId: { $in: courseIds }
      });

      const enhancedStudents = students.map((student) => {
        const enrolledInstructorCourses = student.enrolledCourses
          .filter((course) => courseIds.some(id => id.equals(course._id)))
          .map((course) => {
            const progress = progressRecords.find(
              p => p.userId.equals(student._id) && p.courseId.equals(course._id)
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
      res.redirect('/instructor/dashboard');
    }
  },
};

module.exports = InstructorController;