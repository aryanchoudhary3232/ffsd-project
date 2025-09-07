const mongoose = require("mongoose");

const CartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  items: [
    {
      course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true,
      },
      addedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamp when cart is modified
CartSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Cart = mongoose.model("Cart", CartSchema);

module.exports = Cart;
