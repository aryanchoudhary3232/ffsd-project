const CartModel = require("../models/cart.model");
const UserModel = require("../models/user.model");
const OrderModel = require("../models/order.model");

// Cart controller
const CartController = {
  // Get cart page
  getCart: (req, res) => {
    // if (!req.session.user) {
    //   req.flash("error_msg", "Please login to view your cart");
    //   return res.redirect("/login");
    // }

    const userId = req.session.user.id;
    const { items, total } = CartModel.getCartWithCourses(userId);

    res.render("cart/index", {
      cartItems: items,
      total,
    });
  },

  // Add to cart
  addToCart: (req, res) => {
    // if (!req.session.user) {
    //   return res.status(401).json({ success: false, message: "Unauthorized" });
    // }

    const { courseId } = req.body;
    const userId = req.session.user.id;

    try {
      const result = CartModel.addToCart(userId, courseId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Remove from cart
  removeFromCart: (req, res) => {
    // if (!req.session.user) {
    //   return res.status(401).json({ success: false, message: "Unauthorized" });
    // }

    const { courseId } = req.body;
    const userId = req.session.user.id;

    try {
      const result = CartModel.removeFromCart(userId, courseId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  // Get checkout page
  getCheckout: (req, res) => {
    // if (!req.session.user) {
    //   req.flash("error_msg", "Please login to checkout");
    //   return res.redirect("/login");
    // }

    const userId = req.session.user.id;
    const { items, total } = CartModel.getCartWithCourses(userId);

    if (items.length === 0) {
      req.flash("error_msg", "Your cart is empty");
      return res.redirect("/cart");
    }

    res.render("cart/checkout", {
      cartItems: items,
      total,
    });
  },

  // Process payment
  processPayment: (req, res) => {
    // if (!req.session.user) {
    //   req.flash("error_msg", "Please login to checkout");
    //   return res.redirect("/login");
    // }

    const userId = req.session.user.id;
    const { paymentMethod } = req.body;
    const { items, total } = CartModel.getCartWithCourses(userId);

    if (items.length === 0) {
      req.flash("error_msg", "Your cart is empty");
      return res.redirect("/cart");
    }

    try {
      // Process each course in cart
      for (const item of items) {
        // Enroll user in course
        UserModel.enrollUserInCourse(userId, item.courseId);

        // Create order record
        OrderModel.createOrder({
          userId,
          courseId: item.courseId,
          amount: item.course.price,
          paymentMethod,
          status: "completed",
        });
      }

      // Clear cart
      CartModel.clearCart(userId);

      req.flash(
        "success_msg",
        "Payment successful! You are now enrolled in the courses."
      );
      res.redirect("/dashboard");
    } catch (error) {
      req.flash("error_msg", error.message);
      res.redirect("/cart/checkout");
    }
  },
};

module.exports = CartController;
