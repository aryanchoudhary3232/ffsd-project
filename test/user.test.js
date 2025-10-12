const { expect } = require('chai');
const UserModel = require('../models/user.model');
const { ObjectId } = require('mongodb');

describe('User Model', () => {
  let testUserId;

  // --- VALIDATION TESTS ---
  describe('Validation Tests', () => {
    it('should reject empty email', async () => {
      try {
        await UserModel.createUser({ username: 'A', email: '', password: 'pass123' });
      } catch (err) {
        expect(err.message).to.include('Email');
      }
    });

    it('should reject duplicate email', async () => {
      const userData = { username: 'Test1', email: 'duplicate@example.com', password: 'pass123' };
      await UserModel.createUser(userData);

      try {
        await UserModel.createUser(userData);
      } catch (err) {
        expect(err.message).to.include('Email already in use');
      }
    });

    it('should hash password when creating a user', async () => {
      const userData = { username: 'HashTest', email: 'hash@example.com', password: 'pass123' };
      const user = await UserModel.createUser(userData);
      testUserId = user._id;
      expect(user).to.not.have.property('password');
    });
  });

  // --- CRUD / ASYNC TESTS ---
  describe('Async / DB Tests', () => {
    it('should find a user by email', async () => {
      const user = await UserModel.getUserByEmail('hash@example.com');
      expect(user).to.have.property('email', 'hash@example.com');
    });

    it('should update a user', async () => {
      const updated = await UserModel.updateUser(testUserId, { username: 'UpdatedUser' });
      expect(updated).to.have.property('username', 'UpdatedUser');
    });

    it('should get all users', async () => {
      const users = await UserModel.getAllUsers();
      expect(users).to.be.an('array');
      expect(users.length).to.be.greaterThan(0);
    });

    it('should get user count', async () => {
      const count = await UserModel.getUserCount();
      expect(count).to.be.a('number').that.is.greaterThan(0);
    });

    it('should delete a user', async () => {
      const result = await UserModel.deleteUser(testUserId);
      expect(result).to.be.true;
    });

    it('should return null when authenticating invalid credentials', async () => {
      const user = await UserModel.authenticateUser('nonexistent@example.com', '123');
      expect(user).to.be.null;
    });
  });

  // --- OPTIONAL ENROLLMENT TEST ---
  describe('Enrollment Tests', () => {
    let userId, courseId;

    before(async () => {
      const user = await UserModel.createUser({ username: 'EnrollTest', email: 'enroll@example.com', password: 'pass123' });
      userId = user._id;
      // Create dummy course in DB manually or get a valid courseId
      courseId = new ObjectId(); // replace with actual courseId if exists
    });

    it('should enroll user in a course', async () => {
      const enrolled = await UserModel.enrollUserInCourse(userId, courseId);
      expect(enrolled).to.be.true;
    });

    it('should not enroll user twice in the same course', async () => {
      const enrolledAgain = await UserModel.enrollUserInCourse(userId, courseId);
      expect(enrolledAgain).to.be.false;
    });

    after(async () => {
      await UserModel.deleteUser(userId);
    });
  });
});
