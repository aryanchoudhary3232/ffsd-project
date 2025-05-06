const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RatingSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    courseId: {
        type: Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    username: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1, 
        max: 5
    },
    review: {
        type: String,
        trim: true,
        default: ''
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

RatingSchema.index({ userId: 1, courseId: 1 }, { unique: true });
RatingSchema.index({ courseId: 1, createdAt: -1 });

RatingSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

RatingSchema.statics.calculateAverageRating = async function(courseId) {
    const stats = await this.aggregate([
        {
            $match: { courseId: new mongoose.Types.ObjectId(courseId) }
        },
        {
            $group: {
                _id: '$courseId',
                averageRating: { $avg: '$rating' },
                ratingCount: { $sum: 1 }
            }
        }
    ]);

    try {
        if (stats.length > 0) {
            await mongoose.model('Course').findByIdAndUpdate(courseId, {
                rating: stats[0].averageRating.toFixed(1), 
            });
        } else {
            await mongoose.model('Course').findByIdAndUpdate(courseId, {
                rating: 0,
            });
        }
    } catch (err) {
        console.error('Error updating course rating:', err);
    }
};

RatingSchema.post('save', async function() {
    await this.constructor.calculateAverageRating(this.courseId);
});

RatingSchema.post('remove', async function() {
    await this.constructor.calculateAverageRating(this.courseId);
});

const Rating = mongoose.model('Rating', RatingSchema);