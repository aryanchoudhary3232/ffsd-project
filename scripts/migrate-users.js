const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Connect to MongoDB
const mongoURI = "mongodb://localhost:27017/seekho-bharat";

// User Schema (same as in models/User.js)
const UserSchema = new mongoose.Schema({
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
        type: String
    }],
    completedCourses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    }]
});

const User = mongoose.model('User', UserSchema);

async function migrateUsers() {
    try {
        // Connect to MongoDB
        await mongoose.connect(mongoURI);
        console.log('Connected to MongoDB');

        // Read users from JSON file
        const usersJsonPath = path.join(__dirname, '../data/users.json');
        const usersData = JSON.parse(fs.readFileSync(usersJsonPath, 'utf8'));
        
        console.log(`Found ${usersData.length} users in JSON file`);

        // Clear existing users in MongoDB (optional)
        await User.deleteMany({});
        console.log('Cleared existing users from MongoDB');

        // Migrate each user
        for (const userData of usersData) {
            try {
                // Hash the password
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(userData.password, salt);

                // Create user object for MongoDB
                const userToSave = new User({
                    username: userData.name, // JSON uses 'name', MongoDB uses 'username'
                    email: userData.email,
                    password: hashedPassword,
                    role: userData.role || 'student',
                    joinDate: new Date(userData.joinDate),
                    enrolledCourses: userData.enrolledCourses || [],
                    completedCourses: userData.completedCourses || []
                });

                await userToSave.save();
                console.log(`Migrated user: ${userData.email}`);
            } catch (error) {
                if (error.code === 11000) {
                    console.log(`User ${userData.email} already exists, skipping`);
                } else {
                    console.error(`Error migrating user ${userData.email}:`, error.message);
                }
            }
        }

        console.log('Migration completed successfully!');
        
        // Verify migration
        const userCount = await User.countDocuments();
        console.log(`Total users in MongoDB: ${userCount}`);

        // Test finding the admin user
        const adminUser = await User.findOne({ email: 'admin@seekhobharat.com' });
        if (adminUser) {
            console.log('✓ Admin user found in MongoDB');
            console.log(`Admin user: ${adminUser.username} (${adminUser.email}) - Role: ${adminUser.role}`);
        } else {
            console.log('✗ Admin user not found in MongoDB');
        }

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
}

// Run migration
migrateUsers();
