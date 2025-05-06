const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProgressSchema = new Schema({
    userId: {
        type: String,
        ref: 'User',
        required: true
    },
    courseId: {
        type: String,
        ref: 'Course',
        required: true
    },
    progress: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: 0
    },
    completedLessons: {
        type: [String], 
        default: []
    },
    lastAccessedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: { 
        type: Date,
        default: null
    }
});

ProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true }); 
ProgressSchema.index({ userId: 1, completedAt: 1 }); 
ProgressSchema.pre('save', function(next) {
    this.lastAccessedAt = Date.now();
    if (this.isModified('progress') && this.progress === 100 && !this.completedAt) {
        this.completedAt = Date.now();
    }
    next();
});

const Progress = mongoose.model('Progress', ProgressSchema);