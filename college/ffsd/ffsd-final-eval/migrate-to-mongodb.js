// migrate-to-mongodb.js
// Fixed script to migrate data from data.json to MongoDB

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// --- Configuration ---
const mongoURI = 'mongodb://localhost:27017/seekho-bharat';
const jsonFilePath = path.join(__dirname, 'data', 'data.json');

// --- Define Mongoose Models directly in this file to avoid import issues ---

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'instructor', 'student'], default: 'student' },
  joinDate: { type: Date, default: Date.now },
  enrolledCourses: [String],
  completedCourses: [String],
  originalId: String // To keep track of original IDs
});

// Course Schema
const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  instructorId: { type: String, required: true },
  instructor: { type: String, required: true },
  thumbnail: { type: String },
  rating: { type: Number, default: 0 },
  students: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  featured: { type: Boolean, default: false },
  modules: [
    {
      id: String,
      title: String,
      lessons: [
        {
          id: String,
          title: String,
          type: String,
          duration: String,
          file: String
        }
      ]
    }
  ],
  originalId: String // To keep track of original IDs
});

// Order Schema
const orderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  courseId: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  status: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  originalId: String // To keep track of original IDs
});

// Progress Schema
const progressSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  courseId: { type: String, required: true },
  progress: { type: Number, default: 0 },
  completedLessons: [String]
});

// Cart Schema
const cartSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  items: [
    {
      courseId: { type: String, required: true },
      addedAt: { type: Date, default: Date.now }
    }
  ]
});

// Create models
const User = mongoose.model('User', userSchema);
const Course = mongoose.model('Course', courseSchema);
const Order = mongoose.model('Order', orderSchema);
const Progress = mongoose.model('Progress', progressSchema);
const Cart = mongoose.model('Cart', cartSchema);

// --- Helper Functions ---

/**
 * Reads and parses the JSON data file.
 * @returns {object} Parsed JSON data or null if error.
 */
const readJsonData = () => {
  try {
    console.log(`Reading data from ${jsonFilePath}...`);
    const jsonData = fs.readFileSync(jsonFilePath, 'utf-8');
    return JSON.parse(jsonData);
  } catch (err) {
    console.error(`Error reading or parsing JSON file at ${jsonFilePath}:`, err);
    return null;
  }
};

/**
 * Connects to the MongoDB database.
 */
const connectDB = async () => {
  try {
    console.log(`Connecting to MongoDB at ${mongoURI}...`);
    await mongoose.connect(mongoURI);
    console.log('MongoDB Connected successfully.');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1); // Exit if connection fails
  }
};

/**
 * Disconnects from the MongoDB database.
 */
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('MongoDB Disconnected.');
  } catch (err) {
    console.error('Error disconnecting from MongoDB:', err);
  }
};

/**
 * Clears specified collections in the database.
 * USE WITH CAUTION!
 */
const clearCollections = async () => {
  console.warn('WARNING: Clearing existing data from collections...');
  try {
    await User.deleteMany({});
    await Course.deleteMany({});
    await Order.deleteMany({});
    await Progress.deleteMany({});
    await Cart.deleteMany({});
    console.log('Collections cleared.');
  } catch (err) {
    console.error('Error clearing collections:', err);
    throw err;
  }
};

/**
 * Migrates user data.
 * @param {Array} users - Array of user objects from JSON.
 */
const migrateUsers = async (users) => {
  if (!users || users.length === 0) {
    console.log('No user data found in JSON file.');
    return;
  }
  console.log(`Migrating ${users.length} users...`);
  try {
    // Transform user data to match schema
    const usersToInsert = await Promise.all(users.map(async (user) => {
      // Hash password for security
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(user.password, salt);
      
      return {
        name: user.name,
        email: user.email,
        password: hashedPassword,
        role: user.role,
        joinDate: new Date(user.joinDate),
        enrolledCourses: user.enrolledCourses || [],
        completedCourses: user.completedCourses || [],
        originalId: user.id
      };
    }));
    
    // Insert transformed users
    await User.insertMany(usersToInsert, { ordered: false });
    console.log('User data migrated successfully.');
  } catch (err) {
    console.error('Error migrating user data:', err);
    if (err.writeErrors) {
      err.writeErrors.forEach(e => console.error(` - User Error: ${e.errmsg}`));
    }
  }
};

/**
 * Migrates course data.
 * @param {Array} courses - Array of course objects from JSON.
 */
const migrateCourses = async (courses) => {
  if (!courses || courses.length === 0) {
    console.log('No course data found in JSON file.');
    return;
  }
  console.log(`Migrating ${courses.length} courses...`);
  try {
    // Map JSON data to match schema
    const coursesToInsert = courses.map(course => ({
      title: course.title,
      description: course.description,
      category: course.category,
      price: course.price,
      instructorId: course.instructorId, 
      instructor: course.instructor,
      thumbnail: course.thumbnail,
      rating: course.rating || 0,
      students: course.students || 0,
      createdAt: new Date(course.createdAt),
      updatedAt: new Date(course.updatedAt || course.createdAt),
      featured: course.featured || false,
      modules: course.modules || [],
      originalId: course.id
    }));
    
    await Course.insertMany(coursesToInsert, { ordered: false });
    console.log('Course data migrated successfully.');
  } catch (err) {
    console.error('Error migrating course data:', err);
    if (err.writeErrors) {
      err.writeErrors.forEach(e => console.error(` - Course Error: ${e.errmsg}`));
    }
  }
};

/**
 * Migrates order data.
 * @param {Array} orders - Array of order objects from JSON.
 */
const migrateOrders = async (orders) => {
  if (!orders || orders.length === 0) {
    console.log('No order data found in JSON file.');
    return;
  }
  console.log(`Migrating ${orders.length} orders...`);
  try {
    // Map order data to match schema
    const ordersToInsert = orders.map(order => ({
      userId: order.userId,
      courseId: order.courseId,
      amount: order.amount,
      paymentMethod: order.paymentMethod,
      status: order.status,
      createdAt: new Date(order.createdAt),
      originalId: order.id
    }));
    
    await Order.insertMany(ordersToInsert, { ordered: false });
    console.log('Order data migrated successfully.');
  } catch (err) {
    console.error('Error migrating order data:', err);
    if (err.writeErrors) {
      err.writeErrors.forEach(e => console.error(` - Order Error: ${e.errmsg}`));
    }
  }
};

/**
 * Migrates user progress data.
 * @param {Array} progressData - Array of progress objects from JSON.
 */
const migrateProgress = async (progressData) => {
  if (!progressData || progressData.length === 0) {
    console.log('No progress data found in JSON file.');
    return;
  }
  console.log(`Migrating ${progressData.length} progress records...`);
  try {
    await Progress.insertMany(progressData, { ordered: false });
    console.log('Progress data migrated successfully.');
  } catch (err) {
    console.error('Error migrating progress data:', err);
    if (err.writeErrors) {
      err.writeErrors.forEach(e => console.error(` - Progress Error: ${e.errmsg}`));
    }
  }
};

/**
 * Migrates cart data.
 * @param {Array} carts - Array of cart objects from JSON.
 */
const migrateCarts = async (carts) => {
  if (!carts || carts.length === 0) {
    console.log('No cart data found in JSON file.');
    return;
  }
  console.log(`Migrating ${carts.length} carts...`);
  try {
    await Cart.insertMany(carts, { ordered: false });
    console.log('Cart data migrated successfully.');
  } catch (err) {
    console.error('Error migrating cart data:', err);
    if (err.writeErrors) {
      err.writeErrors.forEach(e => console.error(` - Cart Error: ${e.errmsg}`));
    }
  }
};

// --- Main Migration Function ---
const runMigration = async () => {
  await connectDB();

  const data = readJsonData();
  if (!data) {
    await disconnectDB();
    return; // Stop if JSON reading failed
  }

  // Uncomment to clear existing data before migrating
  // await clearCollections();

  // Migrate data sequentially
  await migrateUsers(data.users);
  await migrateCourses(data.courses);
  await migrateOrders(data.orders);
  await migrateProgress(data.progress);
  await migrateCarts(data.carts);

  await disconnectDB();
  console.log('Migration process finished.');
};

// Execute the migration
runMigration();