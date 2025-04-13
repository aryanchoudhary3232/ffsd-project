const bcrypt = require("bcryptjs");
const { ObjectId } = require("mongodb");
const { getDb } = require("../config/database");

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

const UserModel = {
  getAllUsers: async () => {
    const usersCollection = getUsersCollection();
    return await usersCollection.find({}, { projection: { password: 0 } }).toArray();
  },

  getUserById: async (id) => {
    const usersCollection = getUsersCollection();
    return await usersCollection.findOne({ _id: new ObjectId(id) }, { projection: { password: 0 } });
  },

  getUserByEmail: async (email) => {
    const usersCollection = getUsersCollection();
    return await usersCollection.findOne({ email: email });
  },

  getAdminCount: async () => {
    const usersCollection = getUsersCollection();
    return await usersCollection.countDocuments({ role: "admin" });
  },

  createUser: async (userData) => {
    const usersCollection = getUsersCollection();

    const existingUser = await usersCollection.findOne({ email: userData.email });
    if (existingUser) {
      throw new Error("Email already in use");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    const userToSave = {
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      role: userData.role || "student",
      joinDate: new Date(),
      enrolledCourses: [],
      completedCourses: [],
    };

    try {
      const result = await usersCollection.insertOne(userToSave);
      const newUser = await usersCollection.findOne({ _id: result.insertedId }, { projection: { password: 0 } });
      return newUser;
    } catch (error) {
      console.error("Error creating user:", error);
      throw new Error("Failed to create user: " + error.message);
    }
  },

  updateUser: async (id, userData) => {
    const usersCollection = getUsersCollection();
    const userObjectId = new ObjectId(id);

    const updateData = { ...userData };

    if (userData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(userData.password, salt);
    } else {
      delete updateData.password;
    }

    delete updateData._id;

    const result = await usersCollection.updateOne(
      { _id: userObjectId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      throw new Error("User not found");
    }

    return await usersCollection.findOne({ _id: userObjectId }, { projection: { password: 0 } });
  },

  deleteUser: async (id) => {
    const usersCollection = getUsersCollection();
    const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      throw new Error("User not found");
    }
    return true;
  },

  authenticateUser: async (email, password) => {
    const usersCollection = getUsersCollection();
    const user = await usersCollection.findOne({ email: email });

    if (!user) {
      return null;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return null;
    }

    const { password: pwd, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  enrollUserInCourse: async (userId, courseId) => {
    const usersCollection = getUsersCollection();
    const progressCollection = getProgressCollection();
    const userObjectId = new ObjectId(userId);
    const courseObjectId = new ObjectId(courseId);

    const user = await usersCollection.findOne({ _id: userObjectId, enrolledCourses: courseObjectId });
    if (user) {
        return false;
    }

    const updateResult = await usersCollection.updateOne(
      { _id: userObjectId },
      { $addToSet: { enrolledCourses: courseObjectId } }
    );

    if (updateResult.modifiedCount === 0 && updateResult.matchedCount === 0) {
        throw new Error("User not found");
    }
     if (updateResult.modifiedCount === 0 && updateResult.matchedCount > 0) {
        return false;
    }

    const existingProgress = await progressCollection.findOne({ userId: userObjectId, courseId: courseObjectId });
    if (!existingProgress) {
        await progressCollection.insertOne({
            userId: userObjectId,
            courseId: courseObjectId,
            progress: 0,
            completedLessons: [],
        });
    }

    return true;
  },

  getUserEnrolledCourses: async (userId) => {
    const usersCollection = getUsersCollection();
    const coursesCollection = getCoursesCollection();
    const progressCollection = getProgressCollection();
    const userObjectId = new ObjectId(userId);

    const user = await usersCollection.findOne({ _id: userObjectId }, { projection: { enrolledCourses: 1 } });

    if (!user || !user.enrolledCourses || user.enrolledCourses.length === 0) {
      return [];
    }

    const courses = await coursesCollection.find({ _id: { $in: user.enrolledCourses } }).toArray();

    const progressRecords = await progressCollection.find({ userId: userObjectId, courseId: { $in: user.enrolledCourses } }).toArray();
    const progressMap = progressRecords.reduce((map, p) => {
        map[p.courseId.toString()] = p;
        return map;
    }, {});

    return courses.map(course => {
        const userProgress = progressMap[course._id.toString()] || { progress: 0 };
        return {
            ...course,
            progress: userProgress.progress,
        };
    });
  },

  getUsersByRole: async (role) => {
    const usersCollection = getUsersCollection();
    return await usersCollection.find({ role: role }, { projection: { password: 0 } }).toArray();
  },

  getUserCount: async () => {
    const usersCollection = getUsersCollection();
    return await usersCollection.countDocuments();
  },

  getNewUsers: async () => {
    const usersCollection = getUsersCollection();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return await usersCollection.find(
        { joinDate: { $gte: thirtyDaysAgo } },
        { projection: { password: 0 } }
    ).toArray();
  },
};

module.exports = UserModel;
