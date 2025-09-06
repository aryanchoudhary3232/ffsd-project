const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");

// Sample users data
const sampleUsers = [
  {
    username: "admin",
    email: "admin@seekobharat.com",
    password: "admin123",
    role: "admin",
    joinDate: new Date(),
    isActive: true,
  },
  {
    username: "john_instructor",
    email: "john@seekobharat.com",
    password: "instructor123",
    role: "instructor",
    joinDate: new Date(),
    isActive: true,
  },
  {
    username: "jane_student",
    email: "jane@seekobharat.com",
    password: "student123",
    role: "student",
    joinDate: new Date(),
    isActive: true,
  },
  {
    username: "test_student",
    email: "test@example.com",
    password: "password123",
    role: "student",
    joinDate: new Date(),
    isActive: true,
  },
];

async function addSampleUsers() {
  const client = new MongoClient("mongodb://localhost:27017");

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("seekho-bharat");
    const usersCollection = db.collection("users");

    // Hash passwords and insert users
    for (const user of sampleUsers) {
      // Check if user already exists
      const existingUser = await usersCollection.findOne({ email: user.email });
      if (existingUser) {
        console.log(
          `User with email ${user.email} already exists, skipping...`
        );
        continue;
      }

      // Hash password
      const saltRounds = 10;
      user.password = await bcrypt.hash(user.password, saltRounds);

      // Insert user
      const result = await usersCollection.insertOne(user);
      console.log(
        `Added user: ${user.username} (${user.email}) as ${user.role}`
      );
    }

    console.log("Sample users setup complete!");
    console.log("\nTest credentials:");
    console.log("Admin: admin@seekobharat.com / admin123");
    console.log("Instructor: john@seekobharat.com / instructor123");
    console.log("Student: jane@seekobharat.com / student123");
    console.log("Student: test@example.com / password123");
  } catch (error) {
    console.error("Error adding sample users:", error);
  } finally {
    await client.close();
  }
}

addSampleUsers();
