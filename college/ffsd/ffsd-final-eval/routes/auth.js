const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Sign Up Route
router.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Check if user already exists
        const existingByEmail = await User.findByEmail(email);
        const existingByUsername = await User.findByUsername(username);
        
        if (existingByEmail) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        if (existingByUsername) {
            return res.status(400).json({ error: 'Username already taken' });
        }
        
        // Create new user
        const user = await User.create({ username, email, password });
        
        // Create session
        req.session.userId = user.id;
        req.session.username = user.username;
        
        res.status(201).json({ 
            message: 'User registered successfully', 
            user: { id: user.id, username: user.username, email: user.email } 
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Error registering user' });
    }
});

// Sign In Route
router.post('/signin', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user by email
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Verify password
        const isValid = await User.verifyPassword(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Create session
        req.session.userId = user.id;
        req.session.username = user.username;
        
        res.status(200).json({ 
            message: 'Login successful', 
            user: { id: user.id, username: user.username, email: user.email } 
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Error logging in' });
    }
});

// Log Out Route
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: 'Failed to logout' });
        }
        res.clearCookie('connect.sid'); // Clear session cookie
        res.status(200).json({ message: 'Logged out successfully' });
    });
});

module.exports = router;
