const Course = require("../models/Course");
const User = require("../models/User");
const slugify = require("slugify");
const fs = require("fs");
const path = require("path");

const CourseController = {
  // Get all courses (with filtering options)
  getAllCourses: async (req, res) => {
    try {
      const {
        category,
        level,
        language,
        price,
        search,
        sort = "-createdAt",
        page = 1,
        limit = 10,
      } = req.query;

      const query = {};

      // Apply filters
      if (category) query.category = category;
      if (level) query.level = level;
      if (language) query.language = language;

      // Price filter
      if (price) {
        if (price === "free") {
          query.price = 0;
        } else if (price === "paid") {
          query.price = { $gt: 0 };
        } else if (price.includes("-")) {
          const [min, max] = price.split("-").map(Number);
          query.price = { $gte: min, $lte: max };
        }
      }

      // Search by title or description
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { "instructor.name": { $regex: search, $options: "i" } },
        ];
      }

      // Pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Execute query
      const courses = await Course.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate("instructor", "username name email");

      // Get total count for pagination
      const total = await Course.countDocuments(query);

      // Respond in both new and legacy shapes
      res.json({
        success: true,
        count: courses.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        data: courses,
        courses, // legacy expected by frontend
      });
    } catch (error) {
      console.error("Error getting courses:", error);
      res.status(500).json({
        success: false,
        message: "Error retrieving courses",
        error: error.message,
      });
    }
  },
  // Featured courses
  getFeatured: async (req, res) => {
    try {
      const courses = await Course.find({ isFeatured: true }).limit(12);
      res.json({ success: true, courses });
    } catch (e) {
      res
        .status(500)
        .json({ success: false, message: "Failed to load featured courses" });
    }
  },

  // Search courses simple q param
  searchCourses: async (req, res) => {
    try {
      const q = req.query.q || "";
      const regex = new RegExp(q, "i");
      const courses = await Course.find({
        $or: [{ title: regex }, { description: regex }],
      }).limit(50);
      res.json({ success: true, courses });
    } catch (e) {
      res.status(500).json({ success: false, message: "Search failed" });
    }
  },

  // Get a single course by slug
  getCourseBySlug: async (req, res) => {
    try {
      const { slug } = req.params;

      const course = await Course.findOne({ slug })
        .populate("instructor", "username name email bio profilePicture")
        .populate({
          path: "reviews",
          populate: { path: "user", select: "username name profilePicture" },
        });

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      res.json({
        success: true,
        data: course,
      });
    } catch (error) {
      console.error("Error getting course:", error);
      res.status(500).json({
        success: false,
        message: "Error retrieving course",
        error: error.message,
      });
    }
  },

  // Create a new course
  createCourse: async (req, res) => {
    try {
      const {
        title,
        description,
        category,
        level,
        language,
        price,
        discountPrice,
        lessons,
        requirements,
        whatYouWillLearn,
      } = req.body;

      // Get the instructor from session
      const instructorId = req.session.user.id;

      // Validate input
      if (!title || !description || !category) {
        return res.status(400).json({
          success: false,
          message: "Title, description and category are required",
        });
      }

      // Generate slug
      const slug = slugify(title, { lower: true, strict: true });

      // Handle cover image upload
      let thumbnail = null;
      if (req.file) {
        thumbnail = `/uploads/${req.file.filename}`;
      }

      // Create new course
      const newCourse = new Course({
        title,
        slug,
        description,
        category,
        level: level || "beginner",
        language: language || "English",
        price: price || 0,
        discountPrice,
        instructor: instructorId,
        thumbnail,
        lessons: lessons || [],
        requirements: requirements || [],
        whatYouWillLearn: whatYouWillLearn || [],
      });

      await newCourse.save();

      // Add course to instructor's courses
      await User.findByIdAndUpdate(instructorId, {
        $push: { courses: newCourse._id },
      });

      res.status(201).json({
        success: true,
        message: "Course created successfully",
        data: newCourse,
      });
    } catch (error) {
      console.error("Error creating course:", error);
      res.status(500).json({
        success: false,
        message: "Error creating course",
        error: error.message,
      });
    }
  },

  // Update a course
  updateCourse: async (req, res) => {
    try {
      const { courseId } = req.params;
      const updates = req.body;
      const instructorId = req.session.user.id;

      // Find the course
      const course = await Course.findById(courseId);

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      // Check if user is the instructor or admin
      if (
        course.instructor.toString() !== instructorId &&
        req.session.user.role !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to update this course",
        });
      }

      // If title is updated, update slug too
      if (updates.title) {
        updates.slug = slugify(updates.title, { lower: true, strict: true });
      }

      // Handle cover image update
      if (req.file) {
        // Remove old image if exists
        if (course.thumbnail) {
          const oldImagePath = path.join(
            __dirname,
            "../public",
            course.thumbnail
          );
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
        updates.thumbnail = `/uploads/${req.file.filename}`;
      }

      // Update the course
      const updatedCourse = await Course.findByIdAndUpdate(
        courseId,
        { $set: updates },
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        message: "Course updated successfully",
        data: updatedCourse,
      });
    } catch (error) {
      console.error("Error updating course:", error);
      res.status(500).json({
        success: false,
        message: "Error updating course",
        error: error.message,
      });
    }
  },

  // Delete a course
  deleteCourse: async (req, res) => {
    try {
      const { courseId } = req.params;
      const instructorId = req.session.user.id;

      // Find the course
      const course = await Course.findById(courseId);

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      // Check if user is the instructor or admin
      if (
        course.instructor.toString() !== instructorId &&
        req.session.user.role !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to delete this course",
        });
      }

      // Remove cover image if exists
      if (course.coverImage) {
        const imagePath = path.join(__dirname, "../public", course.coverImage);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }

      // Remove course from instructor's courses
      await User.findByIdAndUpdate(course.instructor, {
        $pull: { courses: courseId },
      });

      // Delete the course
      await Course.findByIdAndDelete(courseId);

      res.json({
        success: true,
        message: "Course deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting course:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting course",
        error: error.message,
      });
    }
  },

  // Get instructor courses
  getInstructorCourses: async (req, res) => {
    try {
      const instructorId = req.params.instructorId || req.session.user.id;

      const courses = await Course.find({ instructor: instructorId }).sort(
        "-createdAt"
      );

      res.json({
        success: true,
        count: courses.length,
        data: courses,
      });
    } catch (error) {
      console.error("Error getting instructor courses:", error);
      res.status(500).json({
        success: false,
        message: "Error retrieving instructor courses",
        error: error.message,
      });
    }
  },

  // Add a lesson to a course
  addLesson: async (req, res) => {
    try {
      const { courseId } = req.params;
      const { title, content, videoUrl, video, duration, order } = req.body;
      const instructorId = req.session.user.id;

      // Find the course
      const course = await Course.findById(courseId);

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      // Check if user is the instructor
      if (course.instructor.toString() !== instructorId) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to add lessons to this course",
        });
      }

      // Create new lesson
      const newLesson = {
        title,
        content,
        video: video || videoUrl, // map videoUrl to video field in schema
        duration: duration || 0,
        order: order || course.lessons.length + 1,
      };

      // Add lesson to course
      course.lessons.push(newLesson);
      await course.save();

      res.status(201).json({
        success: true,
        message: "Lesson added successfully",
        data: course.lessons[course.lessons.length - 1],
      });
    } catch (error) {
      console.error("Error adding lesson:", error);
      res.status(500).json({
        success: false,
        message: "Error adding lesson",
        error: error.message,
      });
    }
  },

  // Update a lesson
  updateLesson: async (req, res) => {
    try {
      const { courseId, lessonId } = req.params;
      const updates = req.body;
      const instructorId = req.session.user.id;

      // Find the course
      const course = await Course.findById(courseId);

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      // Check if user is the instructor
      if (course.instructor.toString() !== instructorId) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to update lessons in this course",
        });
      }

      // Find the lesson index
      const lessonIndex = course.lessons.findIndex(
        (lesson) => lesson._id.toString() === lessonId
      );

      if (lessonIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Lesson not found",
        });
      }

      // Normalize keys
      if (updates.videoUrl && !updates.video) {
        updates.video = updates.videoUrl;
        delete updates.videoUrl;
      }

      // Update the lesson
      Object.keys(updates).forEach((key) => {
        course.lessons[lessonIndex][key] = updates[key];
      });

      await course.save();

      res.json({
        success: true,
        message: "Lesson updated successfully",
        data: course.lessons[lessonIndex],
      });
    } catch (error) {
      console.error("Error updating lesson:", error);
      res.status(500).json({
        success: false,
        message: "Error updating lesson",
        error: error.message,
      });
    }
  },

  // Delete a lesson
  deleteLesson: async (req, res) => {
    try {
      const { courseId, lessonId } = req.params;
      const instructorId = req.session.user.id;

      // Find the course
      const course = await Course.findById(courseId);

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      // Check if user is the instructor
      if (course.instructor.toString() !== instructorId) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to delete lessons from this course",
        });
      }

      // Remove the lesson
      course.lessons = course.lessons.filter(
        (lesson) => lesson._id.toString() !== lessonId
      );

      await course.save();

      res.json({
        success: true,
        message: "Lesson deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting lesson:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting lesson",
        error: error.message,
      });
    }
  },

  // Enroll a user in a course
  enrollInCourse: async (req, res) => {
    try {
      const { courseId } = req.params;
      const userId = req.session.user.id;

      // Find the course
      const course = await Course.findById(courseId);

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      // Check if user is already enrolled
      const user = await User.findById(userId);

      if (user.enrolledCourses.includes(courseId)) {
        return res.status(400).json({
          success: false,
          message: "You are already enrolled in this course",
        });
      }

      // Add course to user's enrolled courses
      user.enrolledCourses.push(courseId);
      await user.save();

      // Increment course enrollments
      course.enrollments += 1;
      await course.save();

      res.json({
        success: true,
        message: "Successfully enrolled in the course",
      });
    } catch (error) {
      console.error("Error enrolling in course:", error);
      res.status(500).json({
        success: false,
        message: "Error enrolling in course",
        error: error.message,
      });
    }
  },

  // Get enrolled courses for a user
  getEnrolledCourses: async (req, res) => {
    try {
      const userId = req.session.user.id;

      const user = await User.findById(userId).populate("enrolledCourses");

      res.json({
        success: true,
        count: user.enrolledCourses.length,
        data: user.enrolledCourses,
      });
    } catch (error) {
      console.error("Error getting enrolled courses:", error);
      res.status(500).json({
        success: false,
        message: "Error retrieving enrolled courses",
        error: error.message,
      });
    }
  },
};

module.exports = CourseController;
