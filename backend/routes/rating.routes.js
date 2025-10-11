const express = require("express");
const router = express.Router();
const RatingController = require("../controllers/rating.controller");
const { isAuthenticated, isAdmin } = require("../controllers/auth.controller");

// Public routes
router.get("/course/:courseId", RatingController.getCourseRatings);

// Protected routes
router.post("/course/:courseId", isAuthenticated, RatingController.addRating);
router.put("/:ratingId", isAuthenticated, RatingController.updateRating);
router.delete("/:ratingId", isAuthenticated, RatingController.deleteRating);
router.get("/user", isAuthenticated, RatingController.getUserRatings);
router.get("/user/:userId", isAuthenticated, RatingController.getUserRatings);

module.exports = router;
