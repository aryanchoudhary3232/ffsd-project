const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Schema = mongoose.Schema;

// Create User Schema
const UserSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: false
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['student', 'instructor', 'admin'],
        default: 'student'
    },
    joinDate: {
        type: Date,
        default: Date.now
    },
    enrolledCourses: [{
        type: Schema.Types.ObjectId,
        ref: 'Course'
    }],
    completedCourses: [{
        type: Schema.Types.ObjectId,
        ref: 'Course'
    }]
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
    // Only hash the password if it's modified (or new)
    if (!this.isModified('password')) return next();
    
    try {
        // Generate salt
        const salt = await bcrypt.genSalt(10);
        // Hash password with salt
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

// Create and export the User model
const User = mongoose.model('User', UserSchema);
module.exports = User;
