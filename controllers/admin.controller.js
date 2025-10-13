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
          let instructorName = course.instructor; // Use existing instructor field first

          // If no instructor field, try to fetch by instructorId
          if (
            !instructorName &&
            course.instructorId &&
            AdminController.isValidObjectId(course.instructorId)
          ) {
            const instructor = await User.findById(course.instructorId);
            instructorName = instructor
              ? instructor.username || instructor.name || instructor.email
              : null;
          }

          return {
            ...course,
            instructor: instructorName || "Unknown Instructor",
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
      const recentCourses = recentCoursesWithInstructors;

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
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }
    try {
      // Get all users
      let users = await User.find();

      // Process user data to ensure all have valid properties
      // This prevents TypeError when accessing user.username.charAt(0) in the template
      users = users.map((user) => {
        const userObj = user.toObject ? user.toObject() : user;
        return {
          ...userObj,
          username:
            userObj.username || userObj.name || userObj.email || "Unknown User", // Ensure username is always a string
          email: userObj.email || "N/A",
        };
      });

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

      // Get admin count to prevent removing the last admin
      const adminCount = await User.countDocuments({ role: "admin" });

      res.render("admin/user-edit", { user, adminCount });
    } catch (error) {
      console.error("Get Edit User Form error:", error);
      req.flash("error_msg", "Could not load user data.");
      res.redirect("/admin/users");
    }
  },

  updateUser: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const userId = req.params.id;
    const { name, email, role } = req.body;

    const buildUpdatePayload = (includeRole = true) => {
      const payload = {};

      if (typeof name === "string") {
        const trimmedName = name.trim();
        if (trimmedName) {
          payload.name = trimmedName;
          payload.username = trimmedName;
        }
      }

      if (typeof email === "string") {
        const trimmedEmail = email.trim();
        if (trimmedEmail) {
          payload.email = trimmedEmail;
        }
      }

      if (includeRole && role) {
        payload.role = role;
      }

      return payload;
    };

    try {
      const user = await User.findById(userId);
      if (!user) {
        req.flash("error_msg", "User not found");
        return res.redirect("/admin/users");
      }

      // Prevent changing own role or another admin's role
      if (
        user.role === "admin" &&
        (role !== "admin" || user._id.equals(req.session.user.id))
      ) {
        if (user._id.equals(req.session.user.id) && role !== "admin") {
          req.flash("error_msg", "Cannot change your own role.");
        } else if (role !== "admin") {
          const adminCount = await User.countDocuments({ role: "admin" });
          if (adminCount <= 1) {
            req.flash("error_msg", "Cannot remove the last admin.");
            return res.redirect("/admin/users");
          }
          req.flash("error_msg", "Cannot change the role of an admin user.");
        }
        if (user.role === "admin" && role !== "admin") {
          req.flash("error_msg", "Admin role cannot be changed.");
          const adminUpdate = await User.findByIdAndUpdate(
            userId,
            buildUpdatePayload(false),
            { new: true }
          );
          if (
            adminUpdate &&
            req.session.user &&
            req.session.user.id === userId.toString()
          ) {
            req.session.user = {
              ...req.session.user,
              name: adminUpdate.name || adminUpdate.username,
              username: adminUpdate.username || adminUpdate.name,
              email: adminUpdate.email,
            };
          }
          req.flash("success_msg", "Admin user info (excluding role) updated.");
          return res.redirect("/admin/users");
        }
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        buildUpdatePayload(true),
        { new: true }
      );
      if (
        updatedUser &&
        req.session.user &&
        req.session.user.id === userId.toString()
      ) {
        req.session.user = {
          ...req.session.user,
          name: updatedUser.name || updatedUser.username,
          username: updatedUser.username || updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
        };
      }
      req.flash("success_msg", "User updated successfully");
      res.redirect("/admin/users");
    } catch (error) {
      console.error("Update User error:", error);
      req.flash("error_msg", error.message || "Error updating user.");
      res.redirect("/admin/users");
    }
  },

  deleteUser: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const userId = req.params.id;

    try {
      const user = await User.findById(userId);

      if (!user) {
        req.flash("error_msg", "User not found");
        return res.redirect("/admin/users");
      }

      if (user._id.equals(req.session.user.id)) {
        req.flash("error_msg", "Cannot delete yourself.");
        return res.redirect("/admin/users");
      }
      if (user.role === "admin") {
        const adminCount = await User.countDocuments({ role: "admin" });
        if (adminCount <= 1) {
          req.flash("error_msg", "Cannot delete the last admin user.");
          return res.redirect("/admin/users");
        }
        req.flash("error_msg", "Cannot delete an admin user.");
        return res.redirect("/admin/users");
      }

      await User.findByIdAndDelete(userId);

      req.flash("success_msg", "User deleted successfully");
      res.redirect("/admin/users");
    } catch (error) {
      console.error("Delete User error:", error);
      req.flash("error_msg", error.message || "Error deleting user.");
      res.redirect("/admin/users");
    }
  },

  getCourses: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const {
      search = "",
      category = "all",
      language = "all",
      sort = "newest",
    } = req.query;
    let query = {};
    let sortOption = { createdAt: -1 };

    // Build query
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { instructor: { $regex: search, $options: "i" } },
      ];
    }
    if (category !== "all") {
      query.category = category;
    }
    if (language !== "all") {
      query.language = language;
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
      // Get courses with search and filter criteria
      let courses;
      if (search) {
        courses = await Course.searchCourses(search);
      } else {
        courses = await Course.getAllCourses();
      }

      // Apply filters manually since the Course model methods don't support all the filtering options
      if (category !== "all") {
        courses = courses.filter((course) => course.category === category);
      }

      if (language !== "all") {
        courses = courses.filter(
          (course) => course.courseLanguage === language
        );
      }

      // Apply sorting
      switch (sort) {
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

      // Enhance courses with instructor data and student count
      const enhancedCoursesPromises = courses.map(async (course) => {
        let instructorName = course.instructor || "Unknown Instructor"; // Use existing instructor field as fallback

        console.log(`Processing course: ${course.title}`);
        console.log(`Course instructorId: ${course.instructorId}`);
        console.log(`Course instructor field: ${course.instructor}`);

        if (
          course.instructorId &&
          AdminController.isValidObjectId(course.instructorId)
        ) {
          try {
            const instructor = await User.findById(course.instructorId);
            console.log(
              `Found instructor:`,
              instructor
                ? `${
                    instructor.name || instructor.username || instructor.email
                  }`
                : "null"
            );

            if (instructor) {
              instructorName =
                instructor.name ||
                instructor.username ||
                instructor.email ||
                course.instructor || // Fallback to stored instructor name
                "Unknown Instructor";
            }
          } catch (error) {
            console.error(
              `Error fetching instructor for course ${course.title}:`,
              error
            );
            // Keep the fallback name (course.instructor or "Unknown Instructor")
          }
        } else {
          console.log(
            `Invalid or missing instructorId for course: ${course.title}`
          );
        }

        const studentCount = await User.countDocuments({
          enrolledCourses: course._id,
        });

        console.log(
          `Final instructor name for ${course.title}: ${instructorName}`
        );

        return {
          ...course,
          students: studentCount,
          instructor: instructorName,
        };
      });
      const enhancedCourses = await Promise.all(enhancedCoursesPromises);

      // Apply language filter in JavaScript if we're not doing it in the database query
      let filteredCourses = enhancedCourses;
      if (language !== "all") {
        filteredCourses = enhancedCourses.filter(
          (course) => course.courseLanguage === language
        );
      }

      const categories = await Course.getAllCategories();

      // Get all unique languages from courses
      const languages = [
        ...new Set(
          enhancedCourses
            .map((course) => course.courseLanguage)
            .filter((lang) => lang) // Remove undefined or empty languages
        ),
      ];

      res.render("admin/courses", {
        courses: filteredCourses,
        categories,
        languages,
        search,
        category,
        language,
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
      // idhar maine course  course.instructor add kiya hai
      // isko dekh lena
      const instructorName =
        instructor?.name ||
        instructor?.username ||
        course.instructor ||
        "Unknown Instructor";
      instructor = {
        name: instructorName,
        username: instructorName, // Adding username property to prevent TypeError
        email: instructor?.email || "N/A",
        id: instructor?._id || null,
      };

      // Find enrolled students
      let enrolledStudents = await User.find(
        { enrolledCourses: courseId },
        "name email"
      );

      // Process student data to ensure all properties exist and are valid
      enrolledStudents = enrolledStudents.map((student) => {
        const studentObj = student.toObject ? student.toObject() : student;
        return {
          ...studentObj,
          name: studentObj.name || "Unknown Student", // Ensure name is always a string
          email: studentObj.email || "N/A",
          id: studentObj._id || null,
        };
      });

      res.render("admin/course-details", {
        course: {
          ...course, // Spread the original course data
          // Override instructor and students with freshly fetched data
          instructor: instructor.username, // Use the fetched instructor username
          students: enrolledStudents.length, // Use the calculated student count
          rating: course.rating || 0, // Ensure rating is a number, default to 0
        },
        instructor: instructor, // Pass the full instructor object as before
        enrolledStudents, // Pass the enrolled students array as before
        // Add success/error messages if needed (optional, based on your flash setup)
        success_msg: req.flash("success_msg"),
        error_msg: req.flash("error_msg"),
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
      console.log(".....", course);
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

    const { title, description, category, price, instructorId } = req.body;

    try {
      if (!title || !description || !category) {
        req.flash("error_msg", "Please fill in all required fields");
        return res.redirect("/admin/courses/new");
      }

      let instructor = null;
      if (instructorId && AdminController.isValidObjectId(instructorId)) {
        instructor = await User.findById(instructorId);
      }
      // Use instructor's name or username, provide clearer fallbacks
      const instructorName = instructor
        ? instructor.name || instructor.username || "Instructor Name Missing"
        : "Unknown Instructor";

      const courseData = {
        title,
        description,
        category,
        price: parseFloat(price) || 0,
        instructorId: instructor ? instructor._id : null, // Store the actual ID found, or null
        instructor: instructorName, // Store the fetched name
        thumbnail: req.file
          ? `/uploads/${req.file.filename}`
          : "/img/placeholder.svg",
        // Add language if it's part of the form
        language: req.body.language || null, // Assuming language might be in req.body
        status: "draft", // Default status
        featured: false, // Default featured
        createdAt: new Date(),
        updatedAt: new Date(),
        modules: [], // Initialize modules
        rating: 0, // Initialize rating
        students: 0, // Initialize students count (though calculated dynamically elsewhere)
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
    const {
      title,
      description,
      category,
      price,
      status,
      featured,
      instructorId,
    } = req.body;

    if (!AdminController.isValidObjectId(courseId)) {
      req.flash("error_msg", "Invalid Course ID format.");
      return res.redirect("/admin/courses");
    }

    try {
      const course = await Course.getCourseById(courseId);
      if (!course) {
        req.flash("error_msg", "Course not found");
        return res.redirect("/admin/courses");
      }

      let instructorName = course.instructor; // Start with existing name
      let finalInstructorId = course.instructorId; // Start with existing ID

      // Check if instructorId is provided and different from the current one
      if (instructorId && instructorId !== course.instructorId?.toString()) {
        if (AdminController.isValidObjectId(instructorId)) {
          const instructor = await User.findById(instructorId);
          if (instructor) {
            instructorName =
              instructor.name ||
              instructor.username ||
              "Instructor Name Missing"; // Get name from fetched user
            finalInstructorId = instructor._id; // Update the ID to be saved
          } else {
            // Instructor ID provided but not found
            req.flash(
              "error_msg",
              "Selected instructor not found. Keeping original instructor."
            );
            // Keep original instructorName and finalInstructorId by not changing them here
          }
        } else {
          req.flash("error_msg", "Invalid instructor ID format provided.");
          return res.redirect(`/admin/courses/${courseId}/edit`);
        }
      } else if (!instructorId && course.instructorId) {
        // If instructorId is cleared in the form, remove instructor info
        instructorName = "Unknown Instructor";
        finalInstructorId = null;
      }

      const courseData = {
        title,
        description,
        category,
        price: parseFloat(price) || 0,
        status: status || "draft",
        featured: featured === "on",
        instructorId: finalInstructorId, // Use the determined ID (could be null)
        instructor: instructorName, // Use the determined name
        language: req.body.language || course.language, // Update language if provided
        updatedAt: new Date(), // Update the timestamp
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

      const courseData = {
        ...course,
        status: status,
        updatedAt: new Date(),
      };

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
      const course = await Course.getCourseById(courseId);
      if (!course) {
        return res
          .status(404)
          .json({ success: false, message: "Course not found" });
      }

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
    const isAjax = req.xhr || req.headers.accept?.indexOf("json") > -1;

    if (!req.session.user || req.session.user.role !== "admin") {
      if (isAjax) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }
      return res.redirect("/login");
    }

    const courseId = req.params.id;

    try {
      const deleted = await Course.deleteCoSeekhoBharat;
      urse(courseId);

      if (!deleted) {
        if (isAjax) {
          return res
            .status(404)
            .json({
              success: false,
              message: "Course not found or could not be deleted",
            });
        }
        req.flash("error_msg", "Course not found or could not be deleted");
        return res.redirect("/admin/courses");
      }

      if (isAjax) {
        return res.json({
          success: true,
          message: "Course deleted successfully",
        });
      }

      req.flash("success_msg", "Course deleted successfully");
      res.redirect("/admin/courses");
    } catch (error) {
      console.error("Admin Delete Course error:", error);
      if (isAjax) {
        return res
          .status(500)
          .json({
            success: false,
            message: error.message || "Error deleting course.",
          });
      }
      req.flash("error_msg", error.message || "Error deleting course.");
      res.redirect("/admin/courses");
    }
  },

  getOrders: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }
    try {
      const orders = await Order.getAllOrders();

      const enhancedOrdersPromises = orders.map(async (order) => {
        let user = null;
        let course = null;

        if (order.userId && AdminController.isValidObjectId(order.userId)) {
          user = await User.findById(order.userId);
        }

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

  getUserDetails: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    try {
      const userId = req.params.id;

      if (!AdminController.isValidObjectId(userId)) {
        req.flash("error_msg", "Invalid User ID format.");
        return res.redirect("/admin/users");
      }

      const user = await User.findById(userId);

      if (!user) {
        req.flash("error_msg", "User not found");
        return res.redirect("/admin/users");
      }

      const adminCount = await User.countDocuments({ role: "admin" });

      let enrolledCourses = [];
      let instructorCourses = [];
      let orders = [];

      if (
        user.role === "student" &&
        user.enrolledCourses &&
        user.enrolledCourses.length > 0
      ) {
        const coursesPromises = user.enrolledCourses.map(async (courseId) => {
          if (!AdminController.isValidObjectId(courseId.toString())) {
            return null;
          }

          const course = await Course.getCourseById(courseId.toString());
          if (!course) return null;

          let progress = 0;
          try {
            progress = Math.floor(Math.random() * 100);
          } catch (err) {
            console.error("Could not get progress:", err);
          }

          return {
            ...course,
            id: courseId,
            progress: progress,
          };
        });

        enrolledCourses = (await Promise.all(coursesPromises)).filter(
          (course) => course !== null
        );
      }

      if (user.role === "instructor") {
        let courses = await Course.getAllCourses();

        instructorCourses = courses
          .filter(
            (course) =>
              course.instructorId &&
              course.instructorId.toString() === userId.toString()
          )
          .map((course) => {
            return {
              ...course,
              id: course._id,
              students: 0,
              rating: course.rating || "N/A",
            };
          });

        for (let i = 0; i < instructorCourses.length; i++) {
          try {
            const studentCount = await User.countDocuments({
              enrolledCourses: instructorCourses[i].id,
            });
            instructorCourses[i].students = studentCount;
          } catch (err) {
            console.error("Error getting student count:", err);
          }
        }
      }

      orders = await Order.getAllOrders();
      orders = orders
        .filter(
          (order) =>
            order.userId && order.userId.toString() === userId.toString()
        )
        .map(async (order) => {
          let course = null;
          if (order.courseId) {
            course = await Course.getCourseById(order.courseId);
          }

          return {
            ...order,
            id: order._id,
            courseTitle: course ? course.title : "Unknown Course",
          };
        });

      orders = await Promise.all(orders);

      res.render("admin/user-details", {
        user: {
          ...(user.toObject ? user.toObject() : user),
          id: user._id,
        },
        enrolledCourses,
        instructorCourses,
        orders,
        adminCount,
        success_msg: req.flash("success_msg"),
        error_msg: req.flash("error_msg"),
      });
    } catch (error) {
      console.error("Get User Details error:", error);
      req.flash("error_msg", "Could not load user details.");
      res.redirect("/admin/users");
    }
  },

  getCourseRatings: async (req, res) => {
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

      let instructor = null;
      if (course.instructorId) {
        instructor = await User.findById(course.instructorId);
      }

      const RatingModel = require("../models/rating.model");

      const ratings = await RatingModel.getCourseRatings(courseId);

      const ratingStats = {
        average: course.rating || 0,
        total: ratings.length,
        distribution: {
          5: ratings.filter((r) => Math.floor(r.rating) === 5).length,
          4: ratings.filter((r) => Math.floor(r.rating) === 4).length,
          3: ratings.filter((r) => Math.floor(r.rating) === 3).length,
          2: ratings.filter((r) => Math.floor(r.rating) === 2).length,
          1: ratings.filter((r) => Math.floor(r.rating) === 1).length,
        },
      };

      ratingStats.percentages = {};
      for (const stars in ratingStats.distribution) {
        ratingStats.percentages[stars] =
          ratings.length > 0
            ? (ratingStats.distribution[stars] / ratings.length) * 100
            : 0;
      }

      res.render("admin/course-ratings", {
        course,
        instructor: instructor ? instructor : { name: "Unknown Instructor" },
        ratings,
        ratingStats,
        success_msg: req.flash("success_msg"),
        error_msg: req.flash("error_msg"),
      });
    } catch (error) {
      console.error("Admin Course Ratings error:", error);
      req.flash("error_msg", "Failed to retrieve course ratings");
      res.redirect("/admin/courses");
    }
  },
};

module.exports = AdminController;
