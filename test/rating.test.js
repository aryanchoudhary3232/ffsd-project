const { expect } = require('chai');
const sinon = require('sinon');
const RatingModel = require('../models/rating.model');
const { ObjectId } = require('mongodb');
const { getDb } = require('../config/database');

// Mock User model's findById for isolation
const User = require('../models/User');

describe('Rating Model', () => {
  let db, users, courses, ratings;
  let userId, courseId;

  before(async () => {
    db = getDb();
    users = db.collection('users');
    courses = db.collection('courses');
    ratings = db.collection('ratings');

    // Insert test user and course
    const userRes = await users.insertOne({ username: 'RatingUser', email: 'ratinguser@example.com' });
    userId = userRes.insertedId;
    const courseRes = await courses.insertOne({ title: 'Rating Course', price: 50 });
    courseId = courseRes.insertedId;

    // Stub User.findById to return our test user
    sinon.stub(User, 'findById').callsFake(async (id) => {
      if (id.toString() === userId.toString()) {
        return { _id: userId, username: 'RatingUser', email: 'ratinguser@example.com' };
      }
      return null;
    });
  });

  after(async () => {
    await users.deleteOne({ _id: userId });
    await courses.deleteOne({ _id: courseId });
    await ratings.deleteMany({ userId });
    User.findById.restore();
  });

  // --- VALIDATION TESTS ---
  describe('Validation Tests', () => {
    it('should throw error if userId or courseId missing', async () => {
      try {
        await RatingModel.addOrUpdateRating(null, courseId, 5);
        expect.fail('Expected error for missing userId');
      } catch (err) {
        expect(err.message).to.include('User ID and Course ID are required');
      }
      try {
        await RatingModel.addOrUpdateRating(userId, null, 5);
        expect.fail('Expected error for missing courseId');
      } catch (err) {
        expect(err.message).to.include('User ID and Course ID are required');
      }
    });

    it('should throw error for invalid rating value', async () => {
      try {
        await RatingModel.addOrUpdateRating(userId, courseId, 10);
        expect.fail('Expected error for invalid rating');
      } catch (err) {
        expect(err.message).to.include('Rating must be between 1 and 5');
      }
    });

    it('should throw error if user not found', async () => {
      User.findById.restore();
      sinon.stub(User, 'findById').resolves(null);
      try {
        await RatingModel.addOrUpdateRating(new ObjectId(), courseId, 4);
        expect.fail('Expected error for user not found');
      } catch (err) {
        expect(err.message).to.include('User not found');
      }
      User.findById.restore();
      sinon.stub(User, 'findById').callsFake(async (id) => {
        if (id.toString() === userId.toString()) {
          return { _id: userId, username: 'RatingUser', email: 'ratinguser@example.com' };
        }
        return null;
      });
    });

    it('should throw error if course not found', async () => {
      try {
        await RatingModel.addOrUpdateRating(userId, new ObjectId(), 4);
        expect.fail('Expected error for course not found');
      } catch (err) {
        expect(err.message).to.include('Course not found');
      }
    });
  });

  // --- ASYNC / DB TESTS ---
  describe('Async / DB Tests', () => {
    it('should add a new rating', async () => {
      const result = await RatingModel.addOrUpdateRating(userId, courseId, 5, 'Great course!');
      expect(result).to.have.property('rating', 5);
      expect(result).to.have.property('review', 'Great course!');
    });

    it('should update an existing rating', async () => {
      const result = await RatingModel.addOrUpdateRating(userId, courseId, 4, 'Updated review');
      expect(result).to.have.property('rating', 4);
      expect(result).to.have.property('review', 'Updated review');
    });

    it('should get user rating for a course', async () => {
      const rating = await RatingModel.getUserRating(userId, courseId);
      expect(rating).to.have.property('rating', 4);
      expect(rating).to.have.property('review', 'Updated review');
    });

    it('should get all ratings for a course', async () => {
      const ratingsArr = await RatingModel.getCourseRatings(courseId);
      expect(ratingsArr).to.be.an('array').that.is.not.empty;
      expect(ratingsArr[0]).to.have.property('rating');
    });

    it('should update course average rating', async () => {
      const avg = await RatingModel.updateCourseAverageRating(courseId);
      expect(avg).to.have.property('averageRating');
      expect(avg).to.have.property('ratingCount');
    });

    it('should delete a rating', async () => {
      const deleted = await RatingModel.deleteRating(userId, courseId);
      expect(deleted).to.be.true;
      const rating = await RatingModel.getUserRating(userId, courseId);
      expect(rating).to.be.null;
    });
  });
});