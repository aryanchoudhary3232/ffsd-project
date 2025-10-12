const { expect } = require('chai');
const OrderModel = require('../models/order.model');
const { ObjectId } = require('mongodb');
const { getDb } = require('../config/database');

describe('Order Model', () => {
  let db, users, courses, orders;
  let userId, courseId, orderId;

  before(async () => {
    db = getDb();
    users = db.collection('users');
    courses = db.collection('courses');
    orders = db.collection('orders');

    // Insert test user and course
    const userRes = await users.insertOne({ username: 'OrderUser', email: 'orderuser@example.com' });
    userId = userRes.insertedId;
    const courseRes = await courses.insertOne({ title: 'Order Course', price: 200 });
    courseId = courseRes.insertedId;
  });

  after(async () => {
    await users.deleteOne({ _id: userId });
    await courses.deleteOne({ _id: courseId });
    await orders.deleteMany({ userId });
  });

  // --- VALIDATION TESTS ---
  describe('Validation Tests', () => {
    it('should return null for invalid order id', async () => {
      const order = await OrderModel.getOrderById('invalidid');
      expect(order).to.be.null;
    });
  });

  // --- ASYNC / DB TESTS ---
  describe('Async / DB Tests', () => {
    it('should create a new order', async () => {
      const orderData = {
        userId: userId.toString(),
        courseId: courseId.toString(),
        items: [{ courseId: courseId, title: 'Order Course' }],
        amount: 200,
        paymentMethod: 'credit_card',
        status: 'completed'
      };
      const order = await OrderModel.createOrder(orderData);
      expect(order).to.have.property('userId');
      expect(order).to.have.property('courseId');
      expect(order).to.have.property('amount', 200);
      expect(order).to.have.property('status', 'completed');
      orderId = order._id;
    });

    it('should get order by id', async () => {
      const order = await OrderModel.getOrderById(orderId);
      expect(order).to.have.property('_id');
      expect(order._id.toString()).to.equal(orderId.toString());
    });

    it('should get all orders', async () => {
      const allOrders = await OrderModel.getAllOrders();
      expect(allOrders).to.be.an('array').that.is.not.empty;
    });

    it('should get orders by user', async () => {
      const userOrders = await OrderModel.getOrdersByUser(userId);
      expect(userOrders).to.be.an('array').that.is.not.empty;
      expect(userOrders[0]).to.have.property('userId');
    });

    it('should update order status', async () => {
      const updated = await OrderModel.updateOrderStatus(orderId, 'refunded');
      expect(updated).to.have.property('status', 'refunded');
    });

    it('should get orders by course', async () => {
      const courseOrders = await OrderModel.getOrdersByCourse(courseId);
      expect(courseOrders).to.be.an('array').that.is.not.empty;
      expect(courseOrders[0]).to.have.property('courseId');
    });

    it('should get total revenue', async () => {
      const revenue = await OrderModel.getTotalRevenue();
      expect(revenue).to.be.a('number');
    });

    it('should get revenue by month', async () => {
      const revenueByMonth = await OrderModel.getRevenueByMonth();
      expect(revenueByMonth).to.be.an('array').that.has.lengthOf(6);
      expect(revenueByMonth[0]).to.have.property('month');
      expect(revenueByMonth[0]).to.have.property('revenue');
    });

    it('should get recent orders with user and course details', async () => {
      const recent = await OrderModel.getRecentOrders(5);
      expect(recent).to.be.an('array');
      if (recent.length > 0) {
        expect(recent[0]).to.have.property('userName');
        expect(recent[0]).to.have.property('courseTitle');
      }
    });
  });
});