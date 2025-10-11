const Cart = require("../models/Cart");
const Course = require("../models/Course");

const CartController = {
  // Get user's cart
  getCart: async (req, res) => {
    try {
      const userId = req.session.user.id;

      // Find user's cart or create a new one
      let cart = await Cart.findOne({ user: userId }).populate({
        path: "items.course",
        select: "title slug price discountPrice coverImage instructor",
        populate: {
          path: "instructor",
          select: "username name",
        },
      });

      if (!cart) {
        cart = await Cart.create({ user: userId, items: [] });
      }

      // Calculate totals
      let subtotal = 0;
      let discount = 0;

      cart.items.forEach((item) => {
        const coursePrice = item.course.price || 0;
        const discountPrice = item.course.discountPrice || coursePrice;

        subtotal += coursePrice;
        discount += coursePrice - discountPrice;
      });

      const total = subtotal - discount;

      const payload = {
        cartId: cart._id,
        items: cart.items,
        itemCount: cart.items.length,
        subtotal,
        discount,
        total,
      };
      res.json({ success: true, data: payload, cart: payload });
    } catch (error) {
      console.error("Error getting cart:", error);
      res.status(500).json({
        success: false,
        message: "Error retrieving cart",
        error: error.message,
      });
    }
  },

  // Add course to cart
  addToCart: async (req, res) => {
    try {
      const { courseId } = req.body;
      const userId = req.session.user.id;

      // Check if course exists
      const course = await Course.findById(courseId);

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      // Find user's cart or create a new one
      let cart = await Cart.findOne({ user: userId });

      if (!cart) {
        cart = await Cart.create({ user: userId, items: [] });
      }

      // Check if course is already in cart
      const existingItem = cart.items.find(
        (item) => item.course.toString() === courseId
      );

      if (existingItem) {
        return res.status(400).json({
          success: false,
          message: "Course is already in your cart",
        });
      }

      // Add course to cart
      cart.items.push({ course: courseId });
      await cart.save();

      // Return updated cart
      cart = await Cart.findById(cart._id).populate({
        path: "items.course",
        select: "title slug price discountPrice coverImage instructor",
        populate: {
          path: "instructor",
          select: "username name",
        },
      });

      // Calculate totals
      let subtotal = 0;
      let discount = 0;

      cart.items.forEach((item) => {
        const coursePrice = item.course.price || 0;
        const discountPrice = item.course.discountPrice || coursePrice;

        subtotal += coursePrice;
        discount += coursePrice - discountPrice;
      });

      const total = subtotal - discount;

      const payload = {
        cartId: cart._id,
        items: cart.items,
        itemCount: cart.items.length,
        subtotal,
        discount,
        total,
      };
      res
        .status(201)
        .json({
          success: true,
          message: "Course added to cart",
          data: payload,
          cart: payload,
        });
    } catch (error) {
      console.error("Error adding to cart:", error);
      res.status(500).json({
        success: false,
        message: "Error adding course to cart",
        error: error.message,
      });
    }
  },

  // Remove course from cart
  removeFromCart: async (req, res) => {
    try {
      const { courseId } = req.params;
      const userId = req.session.user.id;

      // Find user's cart
      const cart = await Cart.findOne({ user: userId });

      if (!cart) {
        return res.status(404).json({
          success: false,
          message: "Cart not found",
        });
      }

      // Remove course from cart
      cart.items = cart.items.filter(
        (item) => item.course.toString() !== courseId
      );

      await cart.save();

      // Return updated cart
      const updatedCart = await Cart.findById(cart._id).populate({
        path: "items.course",
        select: "title slug price discountPrice coverImage instructor",
        populate: {
          path: "instructor",
          select: "username name",
        },
      });

      // Calculate totals
      let subtotal = 0;
      let discount = 0;

      updatedCart.items.forEach((item) => {
        const coursePrice = item.course.price || 0;
        const discountPrice = item.course.discountPrice || coursePrice;

        subtotal += coursePrice;
        discount += coursePrice - discountPrice;
      });

      const total = subtotal - discount;

      const payload = {
        cartId: updatedCart._id,
        items: updatedCart.items,
        itemCount: updatedCart.items.length,
        subtotal,
        discount,
        total,
      };
      res.json({
        success: true,
        message: "Course removed from cart",
        data: payload,
        cart: payload,
      });
    } catch (error) {
      console.error("Error removing from cart:", error);
      res.status(500).json({
        success: false,
        message: "Error removing course from cart",
        error: error.message,
      });
    }
  },

  // Clear cart
  clearCart: async (req, res) => {
    try {
      const userId = req.session.user.id;

      // Find user's cart
      const cart = await Cart.findOne({ user: userId });

      if (!cart) {
        return res.status(404).json({
          success: false,
          message: "Cart not found",
        });
      }

      // Clear cart items
      cart.items = [];
      await cart.save();

      res.json({
        success: true,
        message: "Cart cleared successfully",
        data: {
          cartId: cart._id,
          items: [],
          itemCount: 0,
          subtotal: 0,
          discount: 0,
          total: 0,
        },
      });
    } catch (error) {
      console.error("Error clearing cart:", error);
      res.status(500).json({
        success: false,
        message: "Error clearing cart",
        error: error.message,
      });
    }
  },

  // Checkout cart (convert cart items to enrolled courses)
  checkout: async (req, res) => {
    try {
      const userId = req.session.user.id;

      // Find user's cart
      const cart = await Cart.findOne({ user: userId }).populate(
        "items.course"
      );

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Your cart is empty",
        });
      }

      // Process payment here (in a real app)
      // For now, we'll just enroll the user in all courses

      // Get User model
      const User = require("../models/User");
      const user = await User.findById(userId);

      // Add courses to user's enrolled courses
      for (const item of cart.items) {
        const courseId = item.course._id;

        // Skip if already enrolled
        if (user.enrolledCourses.includes(courseId)) {
          continue;
        }

        // Add to enrolled courses
        user.enrolledCourses.push(courseId);

        // Update course enrollment count
        await Course.findByIdAndUpdate(courseId, { $inc: { enrollments: 1 } });
      }

      await user.save();

      // Clear the cart
      cart.items = [];
      await cart.save();

      res.json({
        success: true,
        message: "Checkout successful. You are now enrolled in these courses.",
      });
    } catch (error) {
      console.error("Error during checkout:", error);
      res.status(500).json({
        success: false,
        message: "Error processing checkout",
        error: error.message,
      });
    }
  },
};

module.exports = CartController;
