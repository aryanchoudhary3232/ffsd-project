const bcrypt = require("bcryptjs");
const { ObjectId } = require("mongodb");
const { getDb } = require("../config/database"); // Assuming getDb returns the MongoDB database instance

// Helper function to get users collection
const getUsersCollection = () => {
  const db = getDb();
  return db.collection("users");
};
const getProgressCollection = () => {
  const db = getDb();
  return db.collection("progress");
};
const getCoursesCollection = () => {
  const db = getDb();
  return db.collection("courses");
};


// User model
const UserModel = {
  // Get all users
  getAllUsers: async () => {
    const usersCollection = getUsersCollection();
    // Exclude password field from the result
    return await usersCollection.find({}, { projection: { password: 0 } }).toArray();
  },

  // Get user by ID
  getUserById: async (id) => {
    const usersCollection = getUsersCollection();
    // Exclude password field from the result
    return await usersCollection.findOne({ _id: new ObjectId(id) }, { projection: { password: 0 } });
  },

  // Get user by email
  getUserByEmail: async (email) => {
    const usersCollection = getUsersCollection();
    // Exclude password field from the result, but keep it for internal checks if needed
    return await usersCollection.findOne({ email: email }); // Keep password for auth check
  },

  // Get count of admins
  getAdminCount: async () => {
    const usersCollection = getUsersCollection();
    return await usersCollection.countDocuments({ role: "admin" });
  },

  // Create new user
  createUser: async (userData) => {
    const usersCollection = getUsersCollection();

    // Check if email already exists
    const existingUser = await usersCollection.findOne({ email: userData.email });
    if (existingUser) {
      throw new Error("Email already in use");
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    // Prepare user data
    const userToSave = {
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      role: userData.role || "student",
      joinDate: new Date(), // Use Date object
      enrolledCourses: [], // Store as ObjectIds if referencing courses collection
      completedCourses: [], // Store as ObjectIds if referencing courses collection
    };

    try {
      const result = await usersCollection.insertOne(userToSave);
      // Fetch the inserted user without the password to return
      const newUser = await usersCollection.findOne({ _id: result.insertedId }, { projection: { password: 0 } });
      return newUser;
    } catch (error) {
      console.error("Error creating user:", error);
      throw new Error("Failed to create user: " + error.message);
    }
  },

  // Update user
  updateUser: async (id, userData) => {
    const usersCollection = getUsersCollection();
    const userObjectId = new ObjectId(id);

    const updateData = { ...userData };

    // If password is provided, hash it
    if (userData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(userData.password, salt);
    } else {
      delete updateData.password; // Ensure password isn't overwritten with undefined
    }

    // Prevent changing _id
    delete updateData._id;

    const result = await usersCollection.updateOne(
      { _id: userObjectId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      throw new Error("User not found");
    }

    // Return updated user without password
    return await usersCollection.findOne({ _id: userObjectId }, { projection: { password: 0 } });
  },

  // Delete user
  deleteUser: async (id) => {
    const usersCollection = getUsersCollection();
    const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      throw new Error("User not found");
    }
    // Optionally: Delete related data like cart, progress etc.
    return true;
  },

  // Authenticate user
  authenticateUser: async (email, password) => {
    const usersCollection = getUsersCollection();
    const user = await usersCollection.findOne({ email: email });

    if (!user) {
      return null; // User not found
    }

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return null; // Password incorrect
    }

    // Return user without password
    const { password: pwd, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  // Enroll user in course
  enrollUserInCourse: async (userId, courseId) => {
    const usersCollection = getUsersCollection();
    const progressCollection = getProgressCollection();
    const userObjectId = new ObjectId(userId);
    const courseObjectId = new ObjectId(courseId);

    // Check if already enrolled using $elemMatch for safety
    const user = await usersCollection.findOne({ _id: userObjectId, enrolledCourses: courseObjectId });
    if (user) {
        return false; // Already enrolled
    }

    // Add course to enrolledCourses array
    const updateResult = await usersCollection.updateOne(
      { _id: userObjectId },
      { $addToSet: { enrolledCourses: courseObjectId } } // Use $addToSet to avoid duplicates
    );

    if (updateResult.modifiedCount === 0 && updateResult.matchedCount === 0) {
        throw new Error("User not found");
    }
     if (updateResult.modifiedCount === 0 && updateResult.matchedCount > 0) {
        // User found but course already in array (though checked before, $addToSet handles this)
        return false;
    }


    // Initialize progress - check if progress already exists first
    const existingProgress = await progressCollection.findOne({ userId: userObjectId, courseId: courseObjectId });
    if (!existingProgress) {
        await progressCollection.insertOne({
            userId: userObjectId,
            courseId: courseObjectId,
            progress: 0,
            completedLessons: [], // Store lesson IDs (could be ObjectIds or simple strings/numbers)
        });
    }

    return true;
  },

  // Get user's enrolled courses with details
  getUserEnrolledCourses: async (userId) => {
    const usersCollection = getUsersCollection();
    const coursesCollection = getCoursesCollection();
    const progressCollection = getProgressCollection();
    const userObjectId = new ObjectId(userId);

    const user = await usersCollection.findOne({ _id: userObjectId }, { projection: { enrolledCourses: 1 } });

    if (!user || !user.enrolledCourses || user.enrolledCourses.length === 0) {
      return [];
    }

    // Fetch course details
    const courses = await coursesCollection.find({ _id: { $in: user.enrolledCourses } }).toArray();

    // Fetch progress for these courses
    const progressRecords = await progressCollection.find({ userId: userObjectId, courseId: { $in: user.enrolledCourses } }).toArray();
    const progressMap = progressRecords.reduce((map, p) => {
        map[p.courseId.toString()] = p;
        return map;
    }, {});


    // Combine course details with progress
    return courses.map(course => {
        const userProgress = progressMap[course._id.toString()] || { progress: 0 };
        return {
            ...course,
            progress: userProgress.progress,
        };
    });
  },

  // Get users by role
  getUsersByRole: async (role) => {
    const usersCollection = getUsersCollection();
    return await usersCollection.find({ role: role }, { projection: { password: 0 } }).toArray();
  },

  // Get user count
  getUserCount: async () => {
    const usersCollection = getUsersCollection();
    return await usersCollection.countDocuments();
  },

  // Get new users (joined in the last 30 days)
  getNewUsers: async () => {
    const usersCollection = getUsersCollection();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return await usersCollection.find(
        { joinDate: { $gte: thirtyDaysAgo } },
        { projection: { password: 0 } }
    ).toArray();
  },

  // Renamed from deleteUserById for clarity, uses the main deleteUser logic now
  // deleteUserById: async (userId) => {
  //   console.log('Reached model deleteUserById');
  //   return await UserModel.deleteUser(userId); // Delegate to the main deleteUser method
  // }
  // Removed deleteUserById as it's redundant with deleteUser
};

module.exports = UserModel;
