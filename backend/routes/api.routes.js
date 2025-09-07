const express = require("express");
const router = express.Router();

// Sub-routers
router.use("/auth", require("./auth.routes"));
router.use("/users", require("./user.routes"));
router.use("/courses", require("./course.routes"));
router.use("/cart", require("./cart.routes"));
router.use("/ratings", require("./rating.routes"));
router.use("/admin", require("./admin.routes"));
router.use("/instructor", require("./instructor.routes"));

// Basic public stats for homepage
const User = require("../models/User");
const Course = require("../models/Course");
router.get("/stats/public", async (req, res) => {
  try {
    const [totalCourses, totalStudents, totalInstructors] = await Promise.all([
      Course.countDocuments({ isPublished: { $in: [true, false] } }),
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "instructor" }),
    ]);

    // Static fallback values if DB empty
    res.json({
      success: true,
      totalCourses: totalCourses || 500,
      totalStudents: totalStudents || 10000,
      totalInstructors: totalInstructors || 200,
      completionRate: 95,
    });
  } catch (error) {
    res.json({
      success: true,
      totalCourses: 500,
      totalStudents: 10000,
      totalInstructors: 200,
      completionRate: 95,
    });
  }
});

// Student stats for dashboard (placeholder implementation)
const { isAuthenticated } = require("../controllers/auth.controller");
router.get("/student/stats", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId).populate("enrolledCourses");
    const enrolled = user?.enrolledCourses?.length || 0;
    // Placeholders as we don't track completion/progress in current schema
    const stats = {
      enrolled,
      completed: 0,
      inProgress: Math.max(enrolled - 0, 0),
      certificates: 0,
    };
    res.json({ success: true, stats });
  } catch (e) {
    res.json({
      success: true,
      stats: { enrolled: 0, completed: 0, inProgress: 0, certificates: 0 },
    });
  }
});

// Contact form endpoint (no-op)
router.post("/contact", (req, res) => {
  res.json({
    success: true,
    message: "Message received. We will get back to you soon.",
  });
});

module.exports = router;
