// const mongoose = require('mongoose');
// const Schema = mongoose.Schema;


// const OrderItemSchema = new Schema({
//     courseId: {
//         type: Schema.Types.ObjectId,
//         ref: 'Course',
//         required: true
//     },
//     title: { 
//         type: String,
//         required: true
//     },
//     price: {
//         type: Number,
//         required: true
//     }
// }, { _id: false });

// const OrderSchema = new Schema({
//     userId: {
//         type: Schema.Types.ObjectId,
//         ref: 'User',
//         required: true
//     },
    
//     courseId: {
//         type: Schema.Types.ObjectId,
//         ref: 'Course',
        
//     },

   
//     items: [OrderItemSchema],

//     amount: {
//         type: Number,
//         required: true
//     },
//     paymentMethod: {
//         type: String,
//         required: true,
//         enum: ['credit_card', 'paypal', 'stripe', 'other'] 
//     },
//     status: {
//         type: String,
//         required: true,
//         enum: ['pending', 'completed', 'failed', 'refunded'],
//         default: 'pending'
//     },
//     transactionId: { 
//         type: String
//     },
//     createdAt: {
//         type: Date,
//         default: Date.now
//     },
//     updatedAt: {
//         type: Date,
//         default: Date.now
//     }
// });

// OrderSchema.index({ userId: 1, status: 1, createdAt: -1 });

// OrderSchema.pre('save', function(next) {
//     this.updatedAt = Date.now();
//     next();
// });

// const Order = mongoose.model('Order', OrderSchema);

// module.exports = Order;



const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const OrderItemSchema = new Schema({
    courseId: {
        type: Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    title: { 
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    }
}, { _id: false });

const OrderSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    courseId: {
        type: Schema.Types.ObjectId,
        ref: 'Course',
        
    },

   
    items: [OrderItemSchema],

    amount: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['credit_card', 'paypal', 'stripe', 'other'] 
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    transactionId: { 
        type: String
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

OrderSchema.index({ userId: 1, status: 1, createdAt: -1 });

OrderSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Order = mongoose.model('Order', OrderSchema);