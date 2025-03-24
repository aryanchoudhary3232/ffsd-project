const fs = require("fs");
const path = require("path");

// Adjust the path to point to the data folder
const dataPath = path.join(__dirname, "../data/data.json");

// Cache for data to avoid repeated file reads
let cachedData = null;
let lastReadTime = 0;
const CACHE_DURATION = 5000; // Cache for 5 seconds

// Helper function to read data.json with caching
function readData() {
  const now = Date.now();
  if (!cachedData || now - lastReadTime > CACHE_DURATION) {
    const rawData = fs.readFileSync(dataPath);
    cachedData = JSON.parse(rawData);
    lastReadTime = now;
  }
  return cachedData;
}

// Helper function to write to data.json and update cache
function writeData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  cachedData = data; // Update cache
  lastReadTime = Date.now();
}

// Course model
const CourseModel = {
  // Get all courses
  getAllCourses: () => {
    return readData().courses;
  },

  // Get course by ID
  getCourseById: (id) => {
    const data = readData();
    return data.courses.find((course) => String(course.id) === String(id));
  },

  // Get featured courses
  getFeaturedCourses: () => {
    const data = readData();
    return data.courses.filter((course) => course.featured).slice(0, 6);
  },

  // Create new course
  createCourse: (courseData) => {
    const data = readData();

    // Create new course
    const newCourse = {
      id: Date.now().toString(),
      title: courseData.title,
      description: courseData.description,
      category: courseData.category,
      price: Number.parseFloat(courseData.price),
      instructorId: String(courseData.instructorId),
      instructor: courseData.instructor,
      thumbnail: courseData.thumbnail || "/img/course-placeholder.jpg",
      rating: 0,
      students: 0, // Will be updated dynamically
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      modules: [],
      featured: false,
    };

    // Add course to data
    data.courses.push(newCourse);
    writeData(data);

    return newCourse;
  },

  // Update course
  updateCourse: (id, courseData) => {
    const data = readData();
    const courseIndex = data.courses.findIndex((course) => String(course.id) === String(id));

    if (courseIndex === -1) {
      throw new Error("Course not found");
    }

    // Update course data
    data.courses[courseIndex] = {
      ...data.courses[courseIndex],
      ...courseData,
      updatedAt: new Date().toISOString(),
    };

    // Recalculate student count
    const enrolledStudents = data.users.filter((user) =>
      user.enrolledCourses.includes(String(id))
    ).length;
    data.courses[courseIndex].students = enrolledStudents;

    writeData(data);
    return data.courses[courseIndex];
  },

  // Delete course
  deleteCourse: (id) => {
    const data = readData();
    const courseIndex = data.courses.findIndex((course) => String(course.id) === String(id));

    if (courseIndex === -1) {
      throw new Error("Course not found");
    }

    // Remove course
    data.courses.splice(courseIndex, 1);
    writeData(data);

    return true;
  },

  // Add module to course
  addModuleToCourse: (courseId, moduleData) => {
    const data = readData();
    const courseIndex = data.courses.findIndex((course) => String(course.id) === String(courseId));

    if (courseIndex === -1) {
      throw new Error("Course not found");
    }

    // Create new module
    const newModule = {
      id: Date.now().toString(),
      title: moduleData.title,
      lessons: [],
    };

    // Add module to course
    data.courses[courseIndex].modules.push(newModule);
    data.courses[courseIndex].updatedAt = new Date().toISOString();

    writeData(data);
    return newModule;
  },

  // Add lesson to module
  addLessonToModule: (courseId, moduleId, lessonData) => {
    const data = readData();
    const courseIndex = data.courses.findIndex((course) => String(course.id) === String(courseId));

    if (courseIndex === -1) {
      throw new Error("Course not found");
    }

    const moduleIndex = data.courses[courseIndex].modules.findIndex(
      (module) => String(module.id) === String(moduleId)
    );

    if (moduleIndex === -1) {
      throw new Error("Module not found");
    }

    // Create new lesson
    const newLesson = {
      id: Date.now().toString(),
      title: lessonData.title,
      type: lessonData.type,
      duration: lessonData.duration || "",
      file: lessonData.file || null,
    };

    // Add lesson to module
    data.courses[courseIndex].modules[moduleIndex].lessons.push(newLesson);
    data.courses[courseIndex].updatedAt = new Date().toISOString();

    writeData(data);
    return newLesson;
  },

  // Get courses by instructor
  getCoursesByInstructor: (instructorId) => {
    const data = readData();
    const courses = data.courses.filter(
      (course) => String(course.instructorId) === String(instructorId)
    );

    // Update student counts for each course
    return courses.map((course) => {
      const enrolledStudents = data.users.filter((user) =>
        user.enrolledCourses.includes(String(course.id))
      ).length;
      return {
        ...course,
        students: enrolledStudents,
      };
    });
  },

  // Get courses by category
  getCoursesByCategory: (category) => {
    const data = readData();
    return data.courses.filter((course) => course.category === category);
  },

  // Search courses
  searchCourses: (query) => {
    const data = readData();
    const searchLower = query.toLowerCase();

    return data.courses.filter(
      (course) =>
        course.title.toLowerCase().includes(searchLower) ||
        course.instructor.toLowerCase().includes(searchLower) ||
        course.category.toLowerCase().includes(searchLower) ||
        course.description.toLowerCase().includes(searchLower)
    );
  },

  // Get all categories
  getAllCategories: () => {
    const data = readData();
    return [...new Set(data.courses.map((course) => course.category))];
  },

  // Get course count
  getCourseCount: () => {
    const data = readData();
    return data.courses.length;
  },

  // Get new courses (created in the last 30 days)
  getNewCourses: () => {
    const data = readData();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return data.courses.filter((course) => {
      const createdAt = new Date(course.createdAt);
      return createdAt >= thirtyDaysAgo;
    });
  },

  // Mark course as featured
  markAsFeatured: (courseId, featured = true) => {
    const data = readData();
    const courseIndex = data.courses.findIndex(
      (course) => String(course.id) === String(courseId)
    );

    if (courseIndex === -1) {
      throw new Error("Course not found");
    }

    data.courses[courseIndex].featured = featured;
    writeData(data);

    return data.courses[courseIndex];
  },
};

module.exports = CourseModel;