const { ObjectId } = require("mongodb");
const { getDb } = require("../config/database");

// Helper function to get collections
const getCollections = () => {
  const db = getDb();
  return {
    courses: db.collection("courses"),
    users: db.collection("users"),
  };
};

// Course model
const CourseModel = {
  // Get all courses
  getAllCourses: async () => {
    const { courses } = getCollections();
    return await courses.find({}).toArray();
  },

  // Get course by ID
  getCourseById: async (id) => {
    try {
      if (!id) {
        console.error("getCourseById called with null or undefined id");
        return null;
      }
      const { courses } = getCollections();
      let course = null;
      // Try to find by ObjectId if possible
      if (ObjectId.isValid(id)) {
        course = await courses.findOne({ _id: new ObjectId(id) });
      }
      // If not found, try to find by string id field
      if (!course) {
        course = await courses.findOne({ id: id.toString() });
      }
      if (!course) {
        console.log(`No course found with ID: ${id}`);
        if (id === "learn") {
          console.log(
            "Warning: 'learn' received as courseId - this likely indicates a URL parsing error"
          );
        }
      }
      return course;
    } catch (error) {
      console.error(`Error in getCourseById(${id}):`, error);
      return null;
    }
  },

  // Get featured courses
  getFeaturedCourses: async () => {
    const { courses } = getCollections();
    return await courses.find({ featured: true }).limit(6).toArray();
  },

  // Create new course
  createCourse: async (courseData) => {
    const { courses } = getCollections();

    // Create new course
    const newCourse = {
      title: courseData.title,
      description: courseData.description,
      category: courseData.category,
      courseLanguage: courseData.courseLanguage || courseData.language || "English",
      price: Number.parseFloat(courseData.price),
      instructorId: String(courseData.instructorId),
      instructor: courseData.instructor,
      thumbnail: courseData.thumbnail || "/img/course-placeholder.jpg",
      rating: 0,
      ratingCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      modules: [], // Ensure modules array exists
      featured: false,
      status: courseData.status || "draft", // Ensure status exists
    };

    // Add course to collection
    const result = await courses.insertOne(newCourse);
    return { _id: result.insertedId, ...newCourse };
  },

  // Update course
  updateCourse: async (id, courseData) => {
    const { courses, users } = getCollections();

    // Validate ID before creating ObjectId
    if (!id || !ObjectId.isValid(id)) {
      throw new Error("Invalid course ID format");
    }

    // Create ObjectId safely
    const courseId = new ObjectId(id);

    // Get current course
    const course = await courses.findOne({ _id: courseId });
    if (!course) {
      throw new Error("Course not found");
    }

    // Update course data - DO NOT calculate/save student count here
    const updatedCourse = {
      ...course,
      ...courseData,
      updatedAt: new Date(),
    };

    // Remove _id from the update data
    delete updatedCourse._id;

    // Update in database
    await courses.updateOne({ _id: courseId }, { $set: updatedCourse });

    // Return the updated course (without the potentially stale student count)
    // Fetch fresh data if needed after update, or rely on dynamic calculation elsewhere
    const freshCourseData = await courses.findOne({ _id: courseId });
    return freshCourseData;
  },

  // Delete course
  deleteCourse: async (id) => {
    const { courses } = getCollections();
    // Fix: Use new ObjectId() instead of createFromTime
    const courseId = new ObjectId(id);

    // Find and delete the course
    const result = await courses.deleteOne({ _id: courseId });
    return result.deletedCount === 1;
  },

  // Add module to course
  addModuleToCourse: async (courseId, moduleData) => {
    const { courses } = getCollections();
    // Fix: Use new ObjectId() instead of createFromTime
    const courseObjId = new ObjectId(courseId);

    // Create new module
    const newModule = {
      _id: new ObjectId(),
      title: moduleData.title,
      lessons: [],
    };

    // Add module to course
    await courses.updateOne(
      { _id: courseObjId },
      {
        $push: { modules: newModule },
        $set: { updatedAt: new Date() },
      }
    );

    return newModule;
  },

  // Add lesson to module
  addLessonToModule: async (courseId, moduleId, lessonData) => {
    const { courses } = getCollections();
    // Fix: Use new ObjectId() instead of createFromTime
    const courseObjId = new ObjectId(courseId);
    // Fix: For moduleId, we need to convert it correctly
    const moduleObjId = new ObjectId(moduleId);

    // Create new lesson
    const newLesson = {
      _id: new ObjectId(),
      title: lessonData.title,
      type: lessonData.type,
      duration: lessonData.duration || "",
      file: lessonData.file || null,
    };

    // Add lesson to module
    await courses.updateOne(
      { _id: courseObjId, "modules._id": moduleObjId },
      {
        $push: { "modules.$.lessons": newLesson },
        $set: { updatedAt: new Date() },
      }
    );

    return newLesson;
  },

  // Get courses by instructor
  getCoursesByInstructor: async (instructorId) => {
    const { courses, users } = getCollections();

    const instructorCourses = await courses
      .find({
        instructorId: instructorId.toString(),
      })
      .toArray();

    // Update student count for each course
    const updatedCourses = [];

    for (const course of instructorCourses) {
      const enrolledStudents = await users.countDocuments({
        enrolledCourses: course._id.toString(),
      });

      updatedCourses.push({
        ...course,
        students: enrolledStudents,
      });
    }

    return updatedCourses;
  },

  // Get courses by category
  getCoursesByCategory: async (category) => {
    const { courses } = getCollections();
    return await courses.find({ category }).toArray();
  },

  // Search courses
  searchCourses: async (query) => {
    const { courses } = getCollections();

    // Create a regex that matches the start of the word (case-insensitive)
    const regex = new RegExp(`^${query}`, "i");

    return await courses
      .find({
        $or: [
          { title: regex },
          { instructor: regex },
          { category: regex },
          { description: regex },
        ],
      })
      .toArray();
  },

  // Get all categories
  getAllCategories: async () => {
    const { courses } = getCollections();
    const result = await courses.distinct("category");
    return result;
  },

  // Get all languages
  getAllLanguages: async () => {
    const { courses } = getCollections();
    const result = await courses.distinct("courseLanguage");
    return result;
  },

  // Get courses by language
  getCoursesByLanguage: async (language) => {
    const { courses } = getCollections();

    // Special case for English - also include courses with null/undefined courseLanguage
    // since English is the default language
    if (language === "English") {
      return await courses
        .find({
          $or: [
            { courseLanguage: "English" },
            { courseLanguage: null },
            { courseLanguage: "" },
            { courseLanguage: { $exists: false } },
          ],
        })
        .toArray();
    }

    // For other languages, use exact matching
    return await courses.find({ courseLanguage: language }).toArray();
  },

  // Get course count
  getCourseCount: async () => {
    const { courses } = getCollections();
    return await courses.countDocuments();
  },

  // Get new courses (created in the last 30 days)
  getNewCourses: async () => {
    const { courses } = getCollections();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return await courses
      .find({
        createdAt: { $gte: thirtyDaysAgo },
      })
      .toArray();
  },

  // Mark course as featured
  markAsFeatured: async (courseId, featured = true) => {
    const { courses } = getCollections();
    // Fix: Use new ObjectId() instead of createFromTime
    const courseObjId = new ObjectId(courseId);

    await courses.updateOne({ _id: courseObjId }, { $set: { featured } });

    return await courses.findOne({ _id: courseObjId });
  },

  // Update course enrollment - update student count and instructor info
  updateCourseEnrollment: async (courseId) => {
    const { courses, users } = getCollections();
    
    // Validate and convert to ObjectId
    if (!courseId || !ObjectId.isValid(courseId)) {
      throw new Error("Invalid course ID format");
    }
    const courseObjId = new ObjectId(courseId);
    
    // Get current course
    const course = await courses.findOne({ _id: courseObjId });
    if (!course) {
      throw new Error("Course not found");
    }
    
    // Calculate current student count by querying users collection
    const studentCount = await users.countDocuments({
      enrolledCourses: courseId.toString()
    });
    
    // Update instructor info if it's missing
    let instructorInfo = course.instructor;
    if (!instructorInfo && course.instructorId) {
      try {
        const instructor = await users.findOne({ _id: new ObjectId(course.instructorId) });
        if (instructor) {
          instructorInfo = instructor.username || instructor.email || "Instructor";
        }
      } catch (error) {
        console.error(`Error fetching instructor for course ${courseId}:`, error);
      }
    }
    
    // Update the course document
    await courses.updateOne(
      { _id: courseObjId },
      { 
        $set: { 
          students: studentCount,
          instructor: instructorInfo,
          updatedAt: new Date()
        } 
      }
    );
    
    return await courses.findOne({ _id: courseObjId });
  },
};

module.exports = CourseModel;
