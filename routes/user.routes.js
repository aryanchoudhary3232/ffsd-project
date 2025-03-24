const express = require("express")
const router = express.Router()
const UserController = require("../controllers/user.controller")
const { isAuthenticated } = require("../middleware/auth.middleware")
const fs = require('fs')
const path = require('path')

// Student dashboard
router.get("/dashboard", isAuthenticated, UserController.getStudentDashboard)

// User profile
router.get("/profile", isAuthenticated, UserController.getUserProfile)
router.put("/profile", isAuthenticated, UserController.updateUserProfile)

router.post('/profile/update', isAuthenticated, (req, res) => {
    try {
        if (!req.user) {
            req.flash('error_msg', 'Authentication error. Please log in again.');
            return res.redirect('/auth/login');
        }
        
        // Read data file
        const dataPath = path.join(__dirname, '../data/data.json');
        if (!fs.existsSync(dataPath)) {
            req.flash('error_msg', 'Data file not found');
            return res.redirect('/user/profile');
        }
        
        let data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        const userId = req.user.id;
        const userIndex = data.users.findIndex(user => user.id === userId);
        
        if (userIndex === -1) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/user/profile');
        }
        
        const { name, email, bio } = req.body;
        data.users[userIndex].name = name || data.users[userIndex].name;
        data.users[userIndex].email = email || data.users[userIndex].email;
        data.users[userIndex].bio = bio || data.users[userIndex].bio;
        
        // Save updated data
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
        req.flash('success_msg', 'Profile updated successfully');
        res.redirect('/user/profile');
        
    } catch (error) {
        console.error('Profile update error:', error);
        req.flash('error_msg', 'Error updating profile');
        res.redirect('/user/profile');
    }
});
  

// Change password
// router.put("/change-password", isAuthenticated, UserController.changePassword)
router.post("/change-password", isAuthenticated, UserController.changePassword)

// User's enrolled courses
router.get("/courses", isAuthenticated, UserController.getUserCourses)

module.exports = router

