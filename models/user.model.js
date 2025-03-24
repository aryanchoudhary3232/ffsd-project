const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const dataPath = path.join(__dirname, "../data/data.json");

// Helper function to read data.json
function readData() {
  const rawData = fs.readFileSync(dataPath);
  return JSON.parse(rawData);
}

// Helper function to write to data.json
function writeData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

// User model
const UserModel = {
  // Get all users
  getAllUsers: () => {
    const data = readData();
    return data.users;
  },

  // Get user by ID
  getUserById: (id) => {
    const data = readData();
    return data.users.find((user) => user.id === id);
  },

  // Get user by email
  getUserByEmail: (email) => {
    const data = readData();
    return data.users.find((user) => user.email === email);
  },

  // Get count of admins
  getAdminCount: () => {
    const data = readData();
    return data.users.filter((user) => user.role === "admin").length;
  },

  // Create new user
  createUser: (userData) => {
    const data = readData();

    // Check if email already exists
    if (data.users.some((user) => user.email === userData.email)) {
      throw new Error("Email already in use");
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(userData.password, 10);

    // Create new user
    const newUser = {
      id: Date.now().toString(),
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      role: userData.role || "student",
      joinDate: new Date().toISOString().split("T")[0],
      enrolledCourses: [],
      completedCourses: [],
    };

    // Add user to data
    data.users.push(newUser);
    writeData(data);

    // Return user without password
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  },

  // Update user
  updateUser: (id, userData) => {
    const data = readData();
    const userIndex = data.users.findIndex((user) => user.id === id);

    if (userIndex === -1) {
      throw new Error("User not found");
    }

    // Update user data
    data.users[userIndex] = {
      ...data.users[userIndex],
      ...userData,
    };

    // If password is provided, hash it
    if (userData.password) {
      data.users[userIndex].password = bcrypt.hashSync(userData.password, 10);
    }

    writeData(data);

    // Return user without password
    const { password, ...userWithoutPassword } = data.users[userIndex];
    return userWithoutPassword;
  },

  // Delete user
  deleteUser: (id) => {
    const data = readData();
    const userIndex = data.users.findIndex((user) => user.id === id);

    if (userIndex === -1) {
      throw new Error("User not found");
    }

    // Remove user
    data.users.splice(userIndex, 1);
    writeData(data);

    return true;
  },

  // Authenticate user
  authenticateUser: (email, password) => {
    const data = readData();
    const user = data.users.find((user) => user.email === email);

    if (!user || !(password === user.password)) {
      return null;
    }

    // Return user without password
    const { password: pwd, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  // Enroll user in course
  enrollUserInCourse: (userId, courseId) => {
    const data = readData();
    const userIndex = data.users.findIndex((user) => user.id === userId);

    if (userIndex === -1) {
      throw new Error("User not found");
    }

    // Check if already enrolled
    if (data.users[userIndex].enrolledCourses.includes(courseId)) {
      return false;
    }

    // Add to enrolled courses
    data.users[userIndex].enrolledCourses.push(courseId);

    // Initialize progress
    data.progress.push({
      userId,
      courseId,
      progress: 0,
      completedLessons: [],
    });

    writeData(data);
    return true;
  },

  // Get user's enrolled courses
  getUserEnrolledCourses: (userId) => {
    const data = readData();
    const user = data.users.find((user) => user.id === userId);

    if (!user) {
      throw new Error("User not found");
    }

    return user.enrolledCourses
      .map((courseId) => {
        const course = data.courses.find((course) => course.id === courseId);
        if (!course) return null;

        const userProgress = data.progress.find(
          (p) => p.userId === userId && p.courseId === courseId
        ) || {
          progress: 0,
        };

        return {
          ...course,
          progress: userProgress.progress,
        };
      })
      .filter(Boolean);
  },

  // Get users by role
  getUsersByRole: (role) => {
    const data = readData();
    return data.users.filter((user) => user.role === role);
  },

  // Get user count
  getUserCount: () => {
    const data = readData();
    return data.users.length;
  },

  // Get new users (joined in the last 30 days)
  getNewUsers: () => {
    const data = readData();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return data.users.filter((user) => {
      const joinDate = new Date(user.joinDate);
      return joinDate >= thirtyDaysAgo;
    });
  },

  deleteUserById: (userId) => {
    console.log('Reached model');
    
    const db = require("../config/database");
    const User = require("../models/User");

    return new Promise((resolve, reject) => {
      db.run("DELETE FROM users WHERE id = ?", [userId], function (err) {
          if (err) {
              reject(new Error("Error deleting user: " + err.message));
              return;
          }
          resolve({ message: "User deleted successfully", changes: this.changes });
      });
  });
  }
  
};

module.exports = UserModel;
