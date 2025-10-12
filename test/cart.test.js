const { expect } = require('chai');
const CartModel = require('../models/cart.model');
const { ObjectId } = require('mongodb');
const { getDb } = require('../config/database');

describe('Cart Model', () => {
  let userId, courseId, db, users, courses, carts;

  before(async () => {
    db = getDb();
    users = db.collection('users');
    courses = db.collection('courses');
    carts = db.collection('carts');

    // Insert a test user and course
    const userRes = await users.insertOne({ username: 'CartUser', email: 'cartuser@example.com', enrolledCourses: [] });
    userId = userRes.insertedId;
    const courseRes = await courses.insertOne({ title: 'Test Course', price: 100 });
    courseId = courseRes.insertedId;
  });

  after(async () => {
    await users.deleteOne({ _id: userId });
    await courses.deleteOne({ _id: courseId });
    await carts.deleteMany({ userId });
  });

  // --- VALIDATION TESTS ---
  describe('Validation Tests', () => {
    it('should throw error for invalid userId', async () => {
      try {
        await CartModel.getCart('invalidid');
      } catch (err) {
        expect(err.message).to.include('Invalid ObjectId');
      }
    });

    it('should throw error if course does not exist', async () => {
      try {
        await CartModel.addToCart(userId, new ObjectId());
      } catch (err) {
        expect(err.message).to.include('Course not found');
      }
    });
  });

  // --- ASYNC / DB TESTS ---
  describe('Async / DB Tests', () => {
    it('should add item to cart', async () => {
      const result = await CartModel.addToCart(userId, courseId);
      expect(result).to.have.property('success', true);
      expect(result.cartCount).to.equal(1);
    });

    it('should not add same course twice', async () => {
      try {
        await CartModel.addToCart(userId, courseId);
      } catch (err) {
        expect(err.message).to.include('Course already in cart');
      }
    });

    it('should get cart with course details', async () => {
      const cart = await CartModel.getCartWithCourses(userId);
      expect(cart.items).to.be.an('array').that.is.not.empty;
      expect(cart.items[0]).to.have.property('course');
      expect(cart.total).to.equal(100);
    });

    it('should remove item from cart', async () => {
      const result = await CartModel.removeFromCart(userId, courseId);
      expect(result).to.have.property('success', true);
      const cart = await CartModel.getCartWithCourses(userId);
      expect(cart.items).to.be.an('array').that.is.empty;
    });

    it('should clear cart', async () => {
      // Add again
      await CartModel.addToCart(userId, courseId);
      const result = await CartModel.clearCart(userId);
      expect(result).to.have.property('success', true);
      const cart = await CartModel.getCartWithCourses(userId);
      expect(cart.items).to.be.an('array').that.is.empty;
    });
  });
});