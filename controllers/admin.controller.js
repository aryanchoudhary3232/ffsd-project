const User = require("../models/User");
const Course = require("../models/course.model");
const Order = require("../models/order.model");

const AdminController = {
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
            recentCoursesData
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: "instructor" }),
            User.countDocuments({ role: "student" }),
            User.countDocuments({ role: "admin" }),
            Course.countDocuments(),
            Order.find({ status: "completed" }),
            User.find().sort({ joinDate: -1 }).limit(5),
            Course.find().sort({ createdAt: -1 }).limit(5).populate('instructorId', 'name')
        ]);

        const totalRevenue = completedOrders.reduce((sum, order) => sum + order.amount, 0);

        // Process recent users/courses if needed (e.g., formatting dates)
        const recentUsers = recentUsersData.map(user => ({
            ...user.toObject(),
        }));
        const recentCourses = recentCoursesData.map(course => ({
            ...course.toObject(),
            instructor: course.instructorId ? course.instructorId.name : "Unknown Instructor",
        }));


        const userDistribution = {
          students: { percentage: totalUsers ? ((totalStudents / totalUsers) * 100).toFixed(1) : 0 },
          instructors: { percentage: totalUsers ? ((totalInstructors / totalUsers) * 100).toFixed(1) : 0 },
          admins: { percentage: totalUsers ? ((totalAdmins / totalUsers) * 100).toFixed(1) : 0 },
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
        res.redirect('/');
    }
  },

  getUsers: async (req, res) => { // Add async
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }
    try { // Add try-catch
        const users = await User.find(); // Get all users
        res.render("admin/users", { users });
    } catch (error) {
        console.error("Get Users error:", error);
        req.flash("error_msg", "Could not load users.");
        res.redirect('/admin/dashboard');
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
      
      res.render("admin/user-edit", { user });
    } catch (error) {
      console.error("Get Edit User Form error:", error);
      req.flash("error_msg", "Could not load user data.");
      res.redirect('/admin/users');
    }
  },

  updateUser: async (req, res) => { // Add async
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const userId = req.params.id;
    const { name, email, role } = req.body;

    try { // Add try-catch
        const user = await User.findById(userId); // Find user first
        if (!user) {
          req.flash("error_msg", "User not found");
          return res.redirect("/admin/users");
        }

        // Prevent changing own role or another admin's role (example)
        if (user.role === "admin" && (role !== "admin" || user._id.equals(req.session.user.id))) {
           if (user._id.equals(req.session.user.id) && role !== "admin") {
               req.flash("error_msg", "Cannot change your own role.");
           } else if (role !== "admin") {
               // Add check to ensure there's at least one admin left if needed
               const adminCount = await User.countDocuments({ role: 'admin' });
               if (adminCount <= 1) {
                   req.flash("error_msg", "Cannot remove the last admin.");
                   return res.redirect("/admin/users");
               }
               req.flash("error_msg", "Cannot change the role of an admin user.");
           } else {
               // Allow updating other fields for self or other admins
           }
           // If only role change is disallowed for admins, adjust logic:
           // if (user.role === "admin" && role !== "admin") { ... }

           // For now, let's just update non-role fields if it's an admin
           if (user.role === "admin" && role !== "admin") {
                req.flash("error_msg", "Admin role cannot be changed.");
                // Only update name and email if they changed
                await User.findByIdAndUpdate(userId, { name, email });
                req.flash("success_msg", "Admin user info (excluding role) updated.");
                return res.redirect("/admin/users");
           }
        }

        // Update user
        await User.findByIdAndUpdate(userId, { name, email, role }, { new: true });
        req.flash("success_msg", "User updated successfully");
        res.redirect("/admin/users");
    } catch (error) {
        console.error("Update User error:", error);
        req.flash("error_msg", error.message || "Error updating user.");
        res.redirect("/admin/users");
    }
  },

  deleteUser: async (req, res) => { // Add async
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const userId = req.params.id;

    try { // Add try-catch
        const user = await User.findById(userId); // Find user first

        if (!user) {
          req.flash("error_msg", "User not found");
          return res.redirect("/admin/users");
        }

        // Prevent deleting self or other admins
        if (user._id.equals(req.session.user.id)) {
            req.flash("error_msg", "Cannot delete yourself.");
            return res.redirect("/admin/users");
        }
        if (user.role === "admin") {
          // Ensure not deleting the last admin
          const adminCount = await User.countDocuments({ role: 'admin' });
          if (adminCount <= 1) {
              req.flash("error_msg", "Cannot delete the last admin user.");
              return res.redirect("/admin/users");
          }
          req.flash("error_msg", "Cannot delete an admin user.");
          return res.redirect("/admin/users");
        }

        // Delete user
        await User.findByIdAndDelete(userId);
        // Optional: Clean up related data (e.g., progress, orders?) - depends on requirements

        req.flash("success_msg", "User deleted successfully");
        res.redirect("/admin/users");
    } catch (error) {
        console.error("Delete User error:", error);
        req.flash("error_msg", error.message || "Error deleting user.");
        res.redirect("/admin/users");
    }
  },

  getCourses: async (req, res) => { // Add async
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const { search = "", category = "all", sort = "newest" } = req.query;
    let query = {};
    let sortOption = { createdAt: -1 };

    // Build query
    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            // Add description/instructor search if needed (instructor requires population first or separate query)
        ];
    }
    if (category !== "all") {
        query.category = category;
    }

    // Build sort option
    switch (sort) {
        case "oldest": sortOption = { createdAt: 1 }; break;
        case "title-asc": sortOption = { title: 1 }; break;
        case "title-desc": sortOption = { title: -1 }; break;
        case "price-low": sortOption = { price: 1 }; break;
        case "price-high": sortOption = { price: -1 }; break;
    }

    try { // Add try-catch
        let courses = await Course.find(query)
                                .populate('instructorId', 'name') // Populate instructor name
                                .sort(sortOption);

        // Enhance with student count (consider aggregation for performance)
        const enhancedCoursesPromises = courses.map(async (course) => {
            const studentCount = await User.countDocuments({ enrolledCourses: course._id });
            return {
                ...course.toObject(),
                students: studentCount,
                instructor: course.instructorId ? course.instructorId.name : "Unknown Instructor",
            };
        });
        const enhancedCourses = await Promise.all(enhancedCoursesPromises);

        const categories = await Course.distinct('category');

        res.render("admin/courses", {
          courses: enhancedCourses,
          categories,
          search,
          category,
          sort,
        });
    } catch (error) {
        console.error("Admin Get Courses error:", error);
        req.flash("error_msg", "Could not load courses.");
        res.redirect('/admin/dashboard');
    }
  },

  getNewCourseForm: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }
    
    try {
      // Get instructors for dropdown
      const instructors = await User.find({ role: "instructor" }, 'name email');
      
      res.render("admin/edit-course", { 
        course: null, // No course data for new course form
        instructors,
        formAction: "/admin/courses", // POST to create new course
        formTitle: "Create New Course"
      });
    } catch (error) {
      console.error("Get New Course Form error:", error);
      req.flash("error_msg", "Could not load course form.");
      res.redirect('/admin/courses');
    }
  },

  getCourseDetails: async (req, res) => { // Add async
     if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }
    try {
        const courseId = req.params.id;
        const course = await Course.findById(courseId).populate('instructorId', 'name email'); // Populate instructor

        if (!course) {
          req.flash("error_msg", "Course not found");
          return res.redirect("/admin/courses");
        }

        // Find enrolled students
        const enrolledStudents = await User.find({ enrolledCourses: courseId }, 'name email'); // Select only name and email

        res.render("admin/course-details", {
          course: {
            ...course.toObject(),
            instructor: course.instructorId ? course.instructorId.name : "Unknown Instructor",
            students: enrolledStudents.length, // Count fetched students
            rating: course.rating || "N/A",
          },
          instructor: course.instructorId || { name: "Unknown", email: "N/A", _id: null }, // Pass instructor object
          enrolledStudents,
        });
    } catch (error) {
        console.error("Admin Get Course Details error:", error);
        req.flash("error_msg", "Could not load course details.");
        res.redirect('/admin/courses');
    }
  },

  getEditCourseForm: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }
    
    try {
      const courseId = req.params.id;
      const course = await Course.findById(courseId);
      
      if (!course) {
        req.flash("error_msg", "Course not found");
        return res.redirect("/admin/courses");
      }
      
      // Get instructors for dropdown
      const instructors = await User.find({ role: "instructor" }, 'name email');
      
      res.render("admin/edit-course", { 
        course, 
        instructors,
        formAction: `/admin/courses/${courseId}?_method=PUT`, // PUT to update existing course
        formTitle: "Edit Course"
      });
    } catch (error) {
      console.error("Get Edit Course Form error:", error);
      req.flash("error_msg", "Could not load course data.");
      res.redirect('/admin/courses');
    }
  },

  createCourse: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }
    
    // Assuming Multer middleware runs before this to handle req.file
    const { title, description, category, price, instructorId } = req.body;
    
    try {
      // Basic validation
      if (!title || !description || !category) {
        req.flash("error_msg", "Please fill in all required fields");
        return res.redirect("/admin/courses/new");
      }
      
      const newCourse = new Course({
        title,
        description,
        category,
        price: parseFloat(price) || 0,
        instructorId: instructorId || req.session.user.id, // Default to current user if no instructor selected
        status: 'draft',
        featured: false,
        thumbnail: req.file ? `/uploads/${req.file.filename}` : '/img/placeholder.svg',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await newCourse.save();
      req.flash("success_msg", "Course created successfully");
      res.redirect(`/admin/courses/${newCourse._id}`);
    } catch (error) {
      console.error("Create Course error:", error);
      req.flash("error_msg", error.message || "Error creating course");
      res.redirect("/admin/courses/new");
    }
  },

  updateCourse: async (req, res) => { // Add async, handle thumbnail upload
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const courseId = req.params.id;
    // Assuming Multer middleware runs before this to handle req.file
    const { title, description, category, price, status, featured, instructorId } = req.body; // Add instructorId if editable by admin

    try {
        const course = await Course.findById(courseId);
        if (!course) {
          req.flash("error_msg", "Course not found");
          return res.redirect("/admin/courses");
        }

        const updates = {
          title,
          description,
          category,
          price: parseFloat(price) || 0,
          status: status || 'draft',
          featured: featured === 'on', // Checkbox value
          updatedAt: new Date(),
          instructorId: instructorId || course.instructorId // Update instructor if provided
        };

        if (req.file) {
          updates.thumbnail = `/uploads/${req.file.filename}`;
          // Optionally delete old thumbnail
        }

        await Course.findByIdAndUpdate(courseId, updates);
        req.flash("success_msg", "Course updated successfully");
        res.redirect(`/admin/courses/${courseId}`); // Redirect to details page
    } catch (error) {
        console.error("Admin Update Course error:", error);
        req.flash("error_msg", error.message || "Error updating course.");
        res.redirect(`/admin/courses/${courseId}/edit`); // Redirect back to edit form on error
    }
  },

  updateCourseStatus: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const courseId = req.params.id;
    const { status } = req.body;
    
    try {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ success: false, message: "Course not found" });
      }
      
      course.status = status;
      course.updatedAt = new Date();
      await course.save();
      
      return res.json({ success: true, message: "Course status updated" });
    } catch (error) {
      console.error("Update Course Status error:", error);
      return res.status(500).json({ success: false, message: error.message || "Error updating course status" });
    }
  },
  
  updateCourseFeatured: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const courseId = req.params.id;
    const { featured } = req.body;
    
    try {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ success: false, message: "Course not found" });
      }
      
      course.featured = featured === 'true' || featured === true;
      course.updatedAt = new Date();
      await course.save();
      
      return res.json({ success: true, message: "Course featured status updated" });
    } catch (error) {
      console.error("Update Course Featured error:", error);
      return res.status(500).json({ success: false, message: error.message || "Error updating course featured status" });
    }
  },

  deleteCourse: async (req, res) => { // Add async
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const courseId = req.params.id;

    try {
        const deletedCourse = await Course.findByIdAndDelete(courseId);

        if (!deletedCourse) {
          req.flash("error_msg", "Course not found");
          return res.redirect("/admin/courses");
        }

        // Optional: Clean up related data
        // - Remove from user enrolledCourses arrays
        // - Delete related Progress records
        // - Delete related Orders (or mark as cancelled?)
        // - Delete thumbnail file from server

        req.flash("success_msg", "Course deleted successfully");
        res.redirect("/admin/courses");
    } catch (error) {
        console.error("Admin Delete Course error:", error);
        req.flash("error_msg", error.message || "Error deleting course.");
        res.redirect("/admin/courses");
    }
  },

  getOrders: async (req, res) => { // Add async
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }
    try {
        const orders = await Order.find()
                                .populate('userId', 'name') // Populate user name
                                .populate('courseId', 'title') // Populate course title
                                .sort({ createdAt: -1 }); // Sort by most recent

        const enhancedOrders = orders.map(order => ({
            ...order.toObject(),
            userName: order.userId ? order.userId.name : "Unknown User",
            courseTitle: order.courseId ? order.courseId.title : "Unknown Course",
        }));

        res.render("admin/orders", { orders: enhancedOrders });
    } catch (error) {
        console.error("Admin Get Orders error:", error);
        req.flash("error_msg", "Could not load orders.");
        res.redirect('/admin/dashboard');
    }
  },

  updateOrderStatus: async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }

    const orderId = req.params.id;
    const { status } = req.body;
    
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }
      
      order.status = status;
      order.updatedAt = new Date();
      await order.save();
      
      return res.json({ success: true, message: "Order status updated" });
    } catch (error) {
      console.error("Update Order Status error:", error);
      return res.status(500).json({ success: false, message: error.message || "Error updating order status" });
    }
  },

  getRevenue: async (req, res) => { // Add async
    if (!req.session.user || req.session.user.role !== "admin") {
      return res.redirect("/login");
    }
    try {
        const completedOrders = await Order.find({ status: "completed" });
        const totalRevenue = completedOrders.reduce((sum, order) => sum + order.amount, 0);

        // Use aggregation pipeline for monthly revenue (more efficient)
        const monthlyRevenueData = await Order.aggregate([
            { $match: { status: "completed" } }, // Filter completed orders
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, // Group by year-month
                    monthlyTotal: { $sum: "$amount" } // Sum amount for each group
                }
            },
            { $sort: { _id: 1 } }, // Sort by month
            {
                $project: { // Reshape the output
                    _id: 0, // Exclude the default _id
                    month: "$_id",
                    revenue: { $round: ["$monthlyTotal", 2] } // Round revenue
                }
            }
        ]);


        res.render("admin/revenue", {
          totalRevenue: totalRevenue.toFixed(2),
          monthlyRevenue: monthlyRevenueData,
        });
    } catch (error) {
        console.error("Admin Get Revenue error:", error);
        req.flash("error_msg", "Could not load revenue data.");
        res.redirect('/admin/dashboard');
    }
  },
};

module.exports = AdminController;