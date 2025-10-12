const { expect } = require('chai');
const CourseModel = require('../models/course.model');
const { ObjectId } = require('mongodb');
const { getDb } = require('../config/database');

describe('Course Model', () => {
  let db, users, courses;
  let courseId, instructorId, moduleId, lessonId;

  before(async () => {
    db = getDb();
    users = db.collection('users');
    courses = db.collection('courses');

    // Insert test instructor
    const instructorRes = await users.insertOne({ username: 'Instructor', email: 'instructor@example.com' });
    instructorId = instructorRes.insertedId;

    // Insert a test course
    const course = await CourseModel.createCourse({
      title: 'Test Course',
      description: 'A course for testing',
      category: 'Testing',
      courseLanguage: 'English',
      price: 99.99,
      instructorId: instructorId.toString(),
      instructor: 'Instructor',
      thumbnail: '/img/test.jpg'
    });
    courseId = course._id;
  });

  after(async () => {
    await users.deleteOne({ _id: instructorId });
    await courses.deleteOne({ _id: courseId });
  });

  // --- VALIDATION TESTS ---
  describe('Validation Tests', () => {
    it('should return null for invalid course id', async () => {
      const course = await CourseModel.getCourseById('invalidid');
      expect(course).to.be.null;
    });

    it('should throw error when updating with invalid id', async () => {
      try {
        await CourseModel.updateCourse('invalidid', { title: 'Fail' });
        expect.fail('Expected error for invalid course ID');
      } catch (err) {
        expect(err.message).to.include('Invalid course ID format');
      }
    });

    it('should throw error when updating non-existent course', async () => {
      try {
        await CourseModel.updateCourse(new ObjectId().toString(), { title: 'Fail' });
        expect.fail('Expected error for course not found');
      } catch (err) {
        expect(err.message).to.include('Course not found');
      }
    });
  });

  // --- ASYNC / DB TESTS ---
  describe('Async / DB Tests', () => {
    it('should get all courses', async () => {
      const allCourses = await CourseModel.getAllCourses();
      expect(allCourses).to.be.an('array').that.is.not.empty;
    });

    it('should get course by id', async () => {
      const course = await CourseModel.getCourseById(courseId);
      expect(course).to.have.property('_id');
      expect(course._id.toString()).to.equal(courseId.toString());
    });

    it('should update a course', async () => {
      const updated = await CourseModel.updateCourse(courseId, { title: 'Updated Title' });
      expect(updated).to.have.property('title', 'Updated Title');
    });

    it('should add a module to course', async () => {
      const module = await CourseModel.addModuleToCourse(courseId, { title: 'Module 1' });
      expect(module).to.have.property('title', 'Module 1');
      moduleId = module._id;
    });

    it('should add a lesson to module', async () => {
      const lesson = await CourseModel.addLessonToModule(courseId, moduleId, { title: 'Lesson 1', type: 'video' });
      expect(lesson).to.have.property('title', 'Lesson 1');
      lessonId = lesson._id;
    });

    it('should get featured courses (should be empty)', async () => {
      const featured = await CourseModel.getFeaturedCourses();
      expect(featured).to.be.an('array');
    });

    it('should mark course as featured', async () => {
      const featured = await CourseModel.markAsFeatured(courseId, true);
      expect(featured).to.have.property('featured', true);
    });

    it('should get courses by instructor', async () => {
      const instructorCourses = await CourseModel.getCoursesByInstructor(instructorId.toString());
      expect(instructorCourses).to.be.an('array').that.is.not.empty;
      expect(instructorCourses[0]).to.have.property('instructorId', instructorId.toString());
    });

    it('should get courses by category', async () => {
      const byCat = await CourseModel.getCoursesByCategory('Testing');
      expect(byCat).to.be.an('array').that.is.not.empty;
    });

    it('should search courses', async () => {
      const results = await CourseModel.searchCourses('Test');
      expect(results).to.be.an('array').that.is.not.empty;
    });

    it('should get all categories', async () => {
      const cats = await CourseModel.getAllCategories();
      expect(cats).to.include('Testing');
    });

    it('should get all languages', async () => {
      const langs = await CourseModel.getAllLanguages();
      expect(langs).to.include('English');
    });

    it('should get courses by language', async () => {
      const byLang = await CourseModel.getCoursesByLanguage('English');
      expect(byLang).to.be.an('array').that.is.not.empty;
    });

    it('should get course count', async () => {
      const count = await CourseModel.getCourseCount();
      expect(count).to.be.a('number').that.is.greaterThan(0);
    });

    it('should get new courses', async () => {
      const newCourses = await CourseModel.getNewCourses();
      expect(newCourses).to.be.an('array').that.is.not.empty;
    });

    it('should update course enrollment', async () => {
      const updated = await CourseModel.updateCourseEnrollment(courseId);
      expect(updated).to.have.property('_id');
    });

    it('should delete a course', async () => {
      const newCourse = await CourseModel.createCourse({
        title: 'Delete Me',
        description: 'To be deleted',
        category: 'Testing',
        courseLanguage: 'English',
        price: 10,
        instructorId: instructorId.toString(),
        instructor: 'Instructor'
      });
      const deleted = await CourseModel.deleteCourse(newCourse._id);
      expect(deleted).to.be.true;
    });
  });
});