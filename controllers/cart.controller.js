const CartModel = require("../models/cart.model"); // Import as CartModel instead of Cart
const User = require("../models/User"); // Assuming Mongoose User model
const Order = require("../models/order.model"); // Assuming Mongoose Order model
const Course = require("../models/course.model"); // Assuming Mongoose Course model
const Progress = require("../models/progress.model"); // Assuming Mongoose Progress model

// Cart controller
const CartController = {
  // Get cart page
  getCart: async (req, res) => {
  if (!req.session.user) {
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    req.flash("error_msg", "Please login to view your cart");
    return res.redirect("/login");
  }

  try {
    const userId = req.session.user.id;
    const cartData = await CartModel.getCartWithCourses(userId);

    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({
        success: true,
        cartItems: cartData.items,
        total: cartData.total,
      });
    }

    res.render("cart/index", {
      cartItems: cartData.items,
      total: cartData.total,
    });
  } catch (error) {
    console.error("Get Cart error:", error);
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json({ success: false, message: "Could not load cart." });
    }
    req.flash("error_msg", "Could not load cart.");
    res.redirect('/');
  }
},

  // Add to cart
  addToCart: async (req, res) => {
    if (!req.session.user) {
      // Check if it's an AJAX request
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      } else {
        req.flash("error_msg", "Please login to add items to cart");
        return res.redirect("/login");
      }
    }

    const { courseId } = req.body;
    const userId = req.session.user.id;

    try {
        // Use CartModel.addToCart method instead
        const result = await CartModel.addToCart(userId, courseId);
        
        // Check if it's an AJAX request
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
          res.json(result);
        } else {
          // Regular form submission - redirect to cart with success message
          req.flash("success_msg", "Course added to cart successfully!");
          res.redirect("/cart");
        }
    } catch (error) {
      console.error("Add to Cart error:", error);
      
      // Check if it's an AJAX request
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        // Check if the error is the "Already enrolled" error
        if (error.message === "Already enrolled in this course") {
            return res.status(400).json({ success: false, message: "You are already enrolled in this course." });
        } else if (error.message === "Course already in cart") {
            return res.status(400).json({ success: false, message: "This course is already in your cart." });
        }
        // Handle other errors
        res.status(500).json({ success: false, message: error.message || "Error adding to cart" });
      } else {
        // Regular form submission - redirect with error message
        if (error.message === "Already enrolled in this course") {
          req.flash("error_msg", "You are already enrolled in this course.");
        } else if (error.message === "Course already in cart") {
          req.flash("error_msg", "This course is already in your cart.");
        } else {
          req.flash("error_msg", "Error adding course to cart. Please try again.");
        }
        res.redirect("back"); // Go back to the previous page
      }
    }
  },


  getCartCount: async (req, res) => {
    try {
      const userId = req.session.user.id;
      const cart = await CartModel.getCart(userId);
      const count = (cart.items && cart.items.length) || 0;
      res.json({ count });
    } catch (err) {
      console.error("Error in getCartCount:", err);
      res.status(500).json({ count: 0, error: "Failed to fetch cart count" });
    }
  },


  // Remove from cart
  removeFromCart: async (req, res) => {
    if (!req.session.user) {
      // Check if it's an AJAX request
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      } else {
        req.flash("error_msg", "Please login to remove items from cart");
        return res.redirect("/login");
      }
    }

    const { courseId } = req.body;
    const userId = req.session.user.id;

    try {
        // Use CartModel.removeFromCart method
        const result = await CartModel.removeFromCart(userId, courseId);
        
        // Check if it's an AJAX request
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
          // Get updated cart count
          const cart = await CartModel.getCartWithCourses(userId);
          const cartCount = cart.items.length;
          res.json({ success: true, cartCount });
        } else {
          // Regular form submission - redirect to cart with success message
          req.flash("success_msg", "Course removed from cart successfully!");
          res.redirect("/cart");
        }
    } catch (error) {
      console.error("Remove From Cart error:", error);
      
      // Check if it's an AJAX request
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        res.status(500).json({ success: false, message: error.message || "Error removing from cart" });
      } else {
        // Regular form submission - redirect with error message
        req.flash("error_msg", "Error removing course from cart. Please try again.");
        res.redirect("/cart");
      }
    }
  },

  // Get checkout page
  getCheckout: async (req, res) => {
    if (!req.session.user) {
      req.flash("error_msg", "Please login to checkout");
      return res.redirect("/login");
    }

    try {
        const userId = req.session.user.id;
        // Use CartModel.getCartWithCourses method
        const cartData = await CartModel.getCartWithCourses(userId);

        if (cartData.items.length === 0) {
          req.flash("error_msg", "Your cart is empty");
          return res.redirect("/cart");
        }

        res.render("cart/checkout", {
          cartItems: cartData.items,
          total: cartData.total,
        });
    } catch (error) {
        console.error("Get Checkout error:", error);
        req.flash("error_msg", "Could not load checkout page.");
        res.redirect('/cart');
    }
  },

  // Process payment
  processPayment: async (req, res) => {
    if (!req.session.user) {
      req.flash("error_msg", "Please login to checkout");
      return res.redirect("/login");
    }

    const userId = req.session.user.id;
    const { paymentMethod } = req.body;

    try {
        // Use CartModel.getCartWithCourses method
        const cartData = await CartModel.getCartWithCourses(userId);

        if (cartData.items.length === 0) {
          req.flash("error_msg", "Your cart is empty");
          return res.redirect("/cart");
        }

        // Process each course in cart
        const orderPromises = [];
        const enrollPromises = [];
        const progressPromises = [];
        const courseUpdatePromises = []; // New array for course updates

        for (const item of cartData.items) {
            const course = item.course;

            // 1. Add course to user's enrolledCourses
            enrollPromises.push(
                User.findByIdAndUpdate(userId, { $addToSet: { enrolledCourses: course._id.toString() } }) // Explicitly add as string
            );

            // 2. Create order record
            orderPromises.push(
                Order.createOrder({
                  userId,
                  courseId: course._id,
                  amount: course.price,
                  paymentMethod: paymentMethod || "default_method",
                  status: "completed",
                  createdAt: new Date()
                })
            );

            // 3. Create initial progress record
            progressPromises.push(
                Progress.initializeProgress(userId, course._id)
            );
            
            // 4. Update course with instructor info and increment student count
            courseUpdatePromises.push(
                Course.updateCourseEnrollment(course._id)
            );
        }

        // Execute all promises
        await Promise.all([...enrollPromises, ...orderPromises, ...progressPromises, ...courseUpdatePromises]);

        // Clear cart
        await CartModel.clearCart(userId);

        req.flash(
          "success_msg",
          "Payment successful! You are now enrolled in the courses."
        );
        res.redirect("/dashboard");
    } catch (error) {
      console.error("Process Payment error:", error);
      req.flash("error_msg", error.message || "Error processing payment");
      res.redirect("/cart/checkout");
    }
  },
};

module.exports = CartController;
