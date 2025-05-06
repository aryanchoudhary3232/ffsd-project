const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ModuleSchema = new Schema({
    moduleId: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    lessons: [{
        lessonId: {
            type: String,
            required: true
        },
        title: {
            type: String,
            required: true,
            trim: true
        },
        type: {
            type: String,
            enum: ['video', 'text', 'quiz'],
            required: true
        },
        content: {
            type: String,
            required: true
        },
        duration: { 
            type: Number
        }
    }]
}, { _id: false });

const CourseSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    instructorId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    instructor: {
        type: String,
        default: null
    },
    thumbnail: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    students: {
        type: Number,
        default: 0
    },
    modules: [ModuleSchema],
    featured: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'archived', null],
        default: 'draft'
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

CourseSchema.index({ title: 'text', category: 'text' });
CourseSchema.index({ instructorId: 1 });
CourseSchema.index({ featured: 1 });

CourseSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Course = mongoose.model('Course', CourseSchema);
