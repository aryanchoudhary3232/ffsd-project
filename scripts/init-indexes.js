const { getDb } = require("../config/database");

async function initializeIndexes() {
  try {
    const db = getDb();

    console.log("Creating indexes for ratings collection...");

    // Create compound index on userId and courseId for faster rating lookups
    await db
      .collection("ratings")
      .createIndex({ userId: 1, courseId: 1 }, { unique: true });

    // Create index on courseId for retrieving all ratings for a course
    await db.collection("ratings").createIndex({ courseId: 1 });

    console.log("Indexes created successfully!");
  } catch (error) {
    console.error("Error creating indexes:", error);
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  // Connect to the database and create indexes
  require("../config/database");

  // Wait for the connection to be established
  setTimeout(() => {
    initializeIndexes()
      .then(() => {
        console.log("Completed index initialization");
        process.exit(0);
      })
      .catch((err) => {
        console.error("Failed to initialize indexes:", err);
        process.exit(1);
      });
  }, 1000);
}

module.exports = { initializeIndexes };
