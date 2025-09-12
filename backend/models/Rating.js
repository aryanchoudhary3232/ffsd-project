const mongoose = require("mongoose");

const RatingSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    review: { type: String },
  },
  { timestamps: true }
);

RatingSchema.index({ course: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("Rating", RatingSchema);
