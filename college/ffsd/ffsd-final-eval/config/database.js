const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Ensure the data directory exists (might still be needed for other file operations)
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// MongoDB connection string with database name
const mongoURI = 'mongodb://localhost:27017/seekho-bharat';

// Connect to MongoDB
mongoose.connect(mongoURI)
.then(() => console.log('MongoDB connected successfully to seekho-bharat database.'))
.catch(err => console.error('MongoDB connection error:', err));

// Optional: Log connection events
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', function() {
  console.log("We're connected to MongoDB seekho-bharat database!");
});

// Function to get the database instance
const getDb = () => {
  return mongoose.connection.db;
};

module.exports = { mongoose, getDb };
