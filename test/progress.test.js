const { expect } = require('chai');
const ProgressModel = require('../models/progress.model');
const { ObjectId } = require('mongodb');
const { getDb } = require('../config/database');

describe('Progress Model', () => {
  let db, users, courses, progress;
  let userId, courseId, lessonIds;

  before(async () => {
    db = getDb();
    users = db.collection('users');
    courses = db.collection('courses');
    progress = db.collection('progress');

    // Insert test user and course
    const userRes = await users.insertOne({ username: 'ProgressUser', email: 'progressuser@example.com' });
    userId = userRes.insertedId;
    lessonIds = ['l1', 'l2', 'l3'];
    const courseRes = await courses.insertOne({ title: 'Progress Course', lessons: lessonIds });
    courseId = courseRes.insertedId;
  });

  after(async () => {
    await users.deleteOne({ _id: userId });
    await courses.deleteOne({ _id: courseId });
    await progress.deleteMany({ userId });
  });

  // --- VALIDATION TESTS ---
  describe('Validation Tests', () => {
    it('should return default progress if none exists', async () => {
      const prog = await ProgressModel.getProgress(userId, courseId);
      expect(prog).to.have.property('userId');
      expect(prog).to.have.property('courseId');
      expect(prog).to.have.property('progress', 0);
      expect(prog).to.have.property('completedLessons').that.is.an('array');
    });
  });

  // --- ASYNC / DB TESTS ---
  describe('Async / DB Tests', () => {
    it('should initialize progress on enrollment', async () => {
      const prog = await ProgressModel.initializeProgress(userId, courseId);
      expect(prog).to.have.property('userId');
      expect(prog).to.have.property('courseId');
      expect(prog).to.have.property('progress', 0);
      expect(prog.completedLessons).to.be.an('array').that.is.empty;
    });

    it('should mark lesson as complete and update progress', async () => {
      const totalLessons = lessonIds.length;
      const prog1 = await ProgressModel.markLessonAsComplete(userId, courseId, lessonIds[0], totalLessons);
      expect(prog1.completedLessons).to.include(lessonIds[0]);
      expect(prog1.progress).to.equal(Math.round((1 / totalLessons) * 100));

      const prog2 = await ProgressModel.markLessonAsComplete(userId, courseId, lessonIds[1], totalLessons);
      expect(prog2.completedLessons).to.include(lessonIds[1]);
      expect(prog2.progress).to.equal(Math.round((2 / totalLessons) * 100));
    });

    it('should not duplicate completed lessons', async () => {
      const totalLessons = lessonIds.length;
      const prog = await ProgressModel.markLessonAsComplete(userId, courseId, lessonIds[0], totalLessons);
      // Should not add duplicate lesson
      const count = prog.completedLessons.filter(l => l === lessonIds[0]).length;
      expect(count).to.equal(1);
    });

    it('should get user overall progress', async () => {
      const overall = await ProgressModel.getUserOverallProgress(userId);
      expect(overall).to.have.property('completedCourses');
      expect(overall).to.have.property('inProgressCourses');
      expect(overall).to.have.property('averageProgress');
    });

    it('should get course completion rate', async () => {
      // Complete all lessons for this user
      await ProgressModel.markLessonAsComplete(userId, courseId, lessonIds[2], lessonIds.length);
      const rate = await ProgressModel.getCourseCompletionRate(courseId);
      expect(rate).to.be.a('number').that.is.at.least(0).and.at.most(100);
    });
  });
});