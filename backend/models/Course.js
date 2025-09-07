const mongoose = require("mongoose");

const CourseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  description: {
    type: String,
    required: true,
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  thumbnail: {
    type: String,
    default: "/img/placeholder.jpg",
  },
  price: {
    type: Number,
    default: 0,
  },
  isFree: {
    type: Boolean,
    default: false,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  duration: {
    type: Number, // in minutes
    default: 0,
  },
  lessons: [
    {
      title: String,
      content: String,
      video: String,
      duration: Number, // in minutes
      order: Number,
    },
  ],
  totalLessons: {
    type: Number,
    default: 0,
  },
  category: {
    type: String,
    enum: [
      "programming",
      "web-development",
      "mobile-development",
      "data-science",
      "ai-ml",
      "design",
      "business",
      "marketing",
      "other",
    ],
    default: "other",
  },
  level: {
    type: String,
    enum: ["beginner", "intermediate", "advanced"],
    default: "beginner",
  },
  language: {
    type: String,
    default: "English",
  },
  requirements: [String],
  goals: [String],
  tags: [String],
  ratings: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      value: Number,
      review: String,
      date: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  averageRating: {
    type: Number,
    default: 0,
  },
  totalRatings: {
    type: Number,
    default: 0,
  },
  enrollments: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  isPublished: {
    type: Boolean,
    default: false,
  },
});

// Create a slug from the title
CourseSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  if (this.isModified("lessons")) {
    this.totalLessons = this.lessons.length;

    // Calculate total duration
    this.duration = this.lessons.reduce((total, lesson) => {
      return total + (lesson.duration || 0);
    }, 0);
  }

  this.updatedAt = Date.now();
  next();
});

const Course = mongoose.model("Course", CourseSchema);

module.exports = Course;
