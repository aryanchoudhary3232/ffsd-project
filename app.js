const express = require('express');
const path = require('path');
const session = require('express-session');
const authRoutes = require('./routes/auth');
const instructorRoutes = require('./routes/instructor.routes');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Routes
app.use('/auth', authRoutes);
app.use('/instructor', instructorRoutes);

// Other routes and middleware
// ...existing code...

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
