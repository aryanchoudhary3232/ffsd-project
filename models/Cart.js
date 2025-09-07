const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CartItemSchema = new Schema({
    courseId: {
        type: Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 1
    },
    price: { 
        type: Number,
        required: true
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

const CartSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    items: [CartItemSchema],
    totalAmount: { // Calculated total amount
        type: Number,
        required: true,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

CartSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    if (this.isModified('items')) {
        this.totalAmount = this.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    }
    next();
});

const Cart = mongoose.model('Cart', CartSchema);

module.exports = Cart;