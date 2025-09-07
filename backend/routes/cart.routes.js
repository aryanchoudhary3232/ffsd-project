const express = require("express");
const router = express.Router();
const CartController = require("../controllers/cart.controller");
const { isAuthenticated } = require("../controllers/auth.controller");

// All cart routes require authentication
router.use(isAuthenticated);

// Cart routes
router.get("/", CartController.getCart);
router.post("/add", CartController.addToCart);
router.delete("/remove/:courseId", CartController.removeFromCart);
// Support SPA calling POST /cart/remove with body { courseId }
router.post("/remove", async (req, res, next) => {
  if (!req.body || !req.body.courseId) {
    return res
      .status(400)
      .json({ success: false, message: "courseId is required" });
  }
  req.params.courseId = req.body.courseId;
  return CartController.removeFromCart(req, res, next);
});
router.delete("/clear", CartController.clearCart);
router.post("/checkout", CartController.checkout);

module.exports = router;
