// const mongoose = require('mongoose');
// const Schema = mongoose.Schema;


// // Comment schema
// const CommentSchema = new Schema({
//     courseId: {
//         type: Schema.Types.ObjectId,
//         ref: 'Course',
//         required: true
//     },
//     lessonId: {
//         type: String,
//         required: false
//     },
//     userId: {
//         type: Schema.Types.ObjectId,
//         ref: 'User',
//         required: true
//     },
//     username: {
//         type: String,
//         required: true,
//         default: 'Anonymous'
//     },
//     comment: {
//         type: String,
//         required: true,
//         trim: true
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


// CommentSchema.index({ courseId: 1, lessonId: 1, createdAt: -1 });

// CommentSchema.pre('save', function(next) {
//     this.updatedAt = Date.now();
//     next();
// });

// const Comment = mongoose.model('Comment', CommentSchema);


const mongoose = require('mongoose');
const Schema = mongoose.Schema;


// Comment schema
const CommentSchema = new Schema({
    courseId: {
        type: Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    lessonId: {
        type: String,
        required: false
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: {
        type: String,
        required: true,
        default: 'Anonymous'
    },
    comment: {
        type: String,
        required: true,
        trim: true
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


CommentSchema.index({ courseId: 1, lessonId: 1, createdAt: -1 });

CommentSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Comment = mongoose.model('Comment', CommentSchema);