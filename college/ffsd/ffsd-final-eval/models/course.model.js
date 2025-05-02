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
        console.error('getCourseById called with null or undefined id');
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
      price: Number.parseFloat(courseData.price),
      instructorId: String(courseData.instructorId),
      instructor: courseData.instructor,
      thumbnail: courseData.thumbnail || "/img/course-placeholder.jpg",
      rating: 0,
      students: 0, // Will be updated dynamically
      createdAt: new Date(),
      updatedAt: new Date(),
      modules: [],
      featured: false,
    };

    // Add course to collection
    const result = await courses.insertOne(newCourse);
    return { _id: result.insertedId, ...newCourse };
  },

  // Update course
  updateCourse: async (id, courseData) => {
    const { courses, users } = getCollections();
    // Fix: Use new ObjectId() instead of createFromTime
    const courseId = new ObjectId(id);

    // Get current course
    const course = await courses.findOne({ _id: courseId });
    if (!course) {
      throw new Error("Course not found");
    }

    // Calculate student count
    const enrolledStudents = await users.countDocuments({ 
      enrolledCourses: id.toString() 
    });

    // Update course data
    const updatedCourse = {
      ...course,
      ...courseData,
      students: enrolledStudents,
      updatedAt: new Date(),
    };

    // Remove _id from the update data
    delete updatedCourse._id;

    // Update in database
    await courses.updateOne({ _id: courseId }, { $set: updatedCourse });
    
    // Return the updated course
    return { _id: courseId, ...updatedCourse };
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
        $set: { updatedAt: new Date() }
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
        $set: { updatedAt: new Date() }
      }
    );

    return newLesson;
  },

  // Get courses by instructor
  getCoursesByInstructor: async (instructorId) => {
    const { courses, users } = getCollections();
    
    const instructorCourses = await courses.find({ 
      instructorId: instructorId.toString() 
    }).toArray();

    // Update student count for each course
    const updatedCourses = [];
    
    for (const course of instructorCourses) {
      const enrolledStudents = await users.countDocuments({ 
        enrolledCourses: course._id.toString() 
      });
      
      updatedCourses.push({
        ...course,
        students: enrolledStudents
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
    const searchLower = query.toLowerCase();

    return await courses.find({ 
      $or: [
        { title: { $regex: searchLower, $options: 'i' } },
        { instructor: { $regex: searchLower, $options: 'i' } },
        { category: { $regex: searchLower, $options: 'i' } },
        { description: { $regex: searchLower, $options: 'i' } }
      ]
    }).toArray();
  },

  // Get all categories
  getAllCategories: async () => {
    const { courses } = getCollections();
    const result = await courses.distinct("category");
    return result;
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

    return await courses.find({ 
      createdAt: { $gte: thirtyDaysAgo } 
    }).toArray();
  },

  // Mark course as featured
  markAsFeatured: async (courseId, featured = true) => {
    const { courses } = getCollections();
    // Fix: Use new ObjectId() instead of createFromTime
    const courseObjId = new ObjectId(courseId);

    await courses.updateOne(
      { _id: courseObjId },
      { $set: { featured } }
    );

    return await courses.findOne({ _id: courseObjId });
  },
};

module.exports = CourseModel;