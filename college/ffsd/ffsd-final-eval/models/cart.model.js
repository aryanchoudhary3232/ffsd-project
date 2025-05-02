const { ObjectId } = require("mongodb");
const mongoose = require('mongoose'); // Add mongoose import
const { getDb } = require("../config/database");

// Helper function to get collections
const getCollections = () => {
  const db = getDb();
  return {
    carts: db.collection("carts"),
    courses: db.collection("courses"),
    users: db.collection("users"),
  };
};

// Safe function to convert string to ObjectId
const toObjectId = (id) => {
  try {
    if (id instanceof ObjectId) return id;
    return new ObjectId(id);
  } catch (error) {
    console.error(`Invalid ObjectId format: ${id}`);
    throw new Error(`Invalid ObjectId format: ${id}`);
  }
};

// Cart model
const CartModel = {
  // Get user's cart
  getCart: async (userId) => {
    const { carts } = getCollections();
    try {
      const userObjectId = toObjectId(userId);
      return (
        (await carts.findOne({ userId: userObjectId })) || { userId: userObjectId, items: [] }
      );
    } catch (error) {
      console.error("Error in getCart:", error);
      return { userId, items: [] }; // Return empty cart on error
    }
  },

  // Add item to cart
  addToCart: async (userId, courseId) => {
    const { carts, courses, users } = getCollections();
    try {
      const userObjectId = toObjectId(userId);
      const courseObjectId = toObjectId(courseId);

      // Check if course exists
      const course = await courses.findOne({ _id: courseObjectId });
      if (!course) {
        throw new Error("Course not found");
      }

      // Check if user is already enrolled
      const user = await users.findOne({ _id: userObjectId });
      if (!user) {
          throw new Error("User not found");
      }
      // Ensure enrolledCourses is an array before checking
      if (user.enrolledCourses && Array.isArray(user.enrolledCourses) && 
          user.enrolledCourses.some(id => id.toString() === courseId.toString())) {
        throw new Error("Already enrolled in this course");
      }

      // Find cart or create if it doesn't exist
      let cart = await carts.findOne({ userId: userObjectId });

      const newItem = {
        courseId: courseObjectId,
        addedAt: new Date(),
      };

      if (!cart) {
        // Create new cart
        const result = await carts.insertOne({
          userId: userObjectId,
          items: [newItem],
        });
        cart = { _id: result.insertedId, userId: userObjectId, items: [newItem] }; // Simulate the created cart object
      } else {
        // Check if course is already in cart
        if (cart.items && cart.items.some((item) => item.courseId.toString() === courseId.toString())) {
          throw new Error("Course already in cart");
        }
        // Add item to existing cart
        await carts.updateOne(
          { _id: cart._id },
          { $push: { items: newItem } }
        );
        // Update local cart object for return value
        cart.items.push(newItem);
      }

      return { success: true, cartCount: cart.items.length };
    } catch (error) {
      console.error("Error in addToCart:", error);
      throw error; // Re-throw to be handled by the controller
    }
  },

  // Remove item from cart
  removeFromCart: async (userId, courseId) => {
    const { carts } = getCollections();
    try {
      const userObjectId = toObjectId(userId);
      const courseObjectId = toObjectId(courseId);

      const result = await carts.updateOne(
        { userId: userObjectId },
        { $pull: { items: { courseId: courseObjectId } } }
      );

      if (result.matchedCount === 0) {
        throw new Error("Cart not found or item not in cart");
      }

      return { success: true };
    } catch (error) {
      console.error("Error in removeFromCart:", error);
      throw error;
    }
  },

  // Get cart items with course details
  getCartWithCourses: async (userId) => {
    const { carts, courses } = getCollections();
    try {
      const userObjectId = toObjectId(userId);

      const cart = await carts.findOne({ userId: userObjectId });

      if (!cart || !cart.items || cart.items.length === 0) {
        return { items: [], total: 0 };
      }

      // Safely convert all courseIds to ObjectId
      const courseIds = cart.items
        .filter(item => item && item.courseId)
        .map(item => toObjectId(item.courseId));
      
      const courseDetails = await courses.find({ _id: { $in: courseIds } }).toArray();

      const courseMap = courseDetails.reduce((map, course) => {
          map[course._id.toString()] = course;
          return map;
      }, {});

      const cartItems = cart.items
        .filter(item => item && item.courseId) // Filter out any invalid items
        .map((item) => {
          const course = courseMap[item.courseId.toString()];
          return {
            ...item,
            course, // Course details might be partial if not found, handle appropriately
          };
        })
        .filter(item => item.course); // Filter out items where course wasn't found

      const total = cartItems.reduce((sum, item) => sum + (item.course?.price || 0), 0);

      return {
        items: cartItems,
        total,
      };
    } catch (error) {
      console.error("Error in getCartWithCourses:", error);
      return { items: [], total: 0 }; // Return empty cart on error
    }
  },

  // Clear cart
  clearCart: async (userId) => {
    const { carts } = getCollections();
    try {
      const userObjectId = toObjectId(userId);
      await carts.updateOne({ userId: userObjectId }, { $set: { items: [] } });
      return { success: true };
    } catch (error) {
      console.error("Error in clearCart:", error);
      throw error;
    }
  },
};

module.exports = CartModel;

