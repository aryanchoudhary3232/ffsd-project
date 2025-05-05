// Script to add various Indian languages to the courses collection
const mongoose = require("mongoose");
const { getDb } = require("../config/database");

async function addLanguagesToCourses() {
  try {
    // Make sure we're connected to the database
    const db = getDb();
    console.log("Connected to database");

    const coursesCollection = db.collection("courses");

    // Languages to ensure are in the database
    const languages = [
      "English",
      "Hindi",
      "Marathi",
      "Telugu",
      "Malayalam",
      "Kannada",
      "Marwadi",
      "Haryanvi",
      "Tamil",
      "Bengali",
      "Gujarati",
      "Punjabi",
      "Odia",
      "Bhojpuri",
    ];

    // Create at least one sample course for each language if none exists
    for (const language of languages) {
      // Check if any course with this language exists
      const courseWithLanguage = await coursesCollection.findOne({ language });

      if (!courseWithLanguage) {
        console.log(`Adding sample course in ${language} language`);

        // Create a sample course with this language
        await coursesCollection.insertOne({
          title: `Sample ${language} Course`,
          description: `This is a sample course in ${language} language.`,
          category: "General",
          language: language,
          price: 0, // Free course
          instructorId: "system",
          thumbnail: "/img/placeholder.svg",
          createdAt: new Date(),
          updatedAt: new Date(),
          modules: [],
          status: "published",
          featured: false,
        });
      } else {
        console.log(`Course in ${language} already exists`);
      }
    }

    // Update any courses that might have null or undefined language
    const updateResult = await coursesCollection.updateMany(
      { language: { $in: [null, undefined, ""] } },
      { $set: { language: "English" } }
    );

    console.log(
      `Updated ${updateResult.modifiedCount} courses with missing language values`
    );
    console.log("Language data update complete");
  } catch (error) {
    console.error("Error updating languages:", error);
  }
}

// Run the function
setTimeout(() => {
  addLanguagesToCourses()
    .then(() => {
      console.log("Script completed successfully");
      // Keep the process running for a bit to ensure operations complete
      setTimeout(() => process.exit(0), 1000);
    })
    .catch((err) => {
      console.error("Script failed:", err);
      process.exit(1);
    });
}, 1000); // Give time for mongoose connection to establish
