const express = require("express");
const router = express.Router();
const CartController = require("../controllers/cart.controller");
const { isAuthenticated } = require("../middleware/auth.middleware");

// Get cart
router.get("/", isAuthenticated, CartController.getCart);

// Add to cart
router.post("/add", isAuthenticated, CartController.addToCart);

// Get cart count (for navbar badge)
router.get("/count", isAuthenticated, CartController.getCartCount);


// Remove from cart
router.post("/remove", isAuthenticated, CartController.removeFromCart);


// Checkout
router.get("/checkout", isAuthenticated, CartController.getCheckout);
router.post(
  "/checkout/process",
  isAuthenticated,
  CartController.processPayment
);

module.exports = router;
