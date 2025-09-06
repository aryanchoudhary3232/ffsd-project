# SeekoBharat - Full Stack Development (FFSD) E-Learning Platform

## Project Overview

This project has been transformed into a Full Stack Development (FFSD) application meeting all the evaluation criteria for mid-evaluations. The application demonstrates core FFSD concepts including DOM manipulation, form validation, dynamic HTML, and AJAX/Fetch API implementation.

## Tech Stack (FFSD Compliant)

### Frontend

- **HTML5** - Semantic markup and structure
- **CSS3** - Styling with Tailwind CSS framework
- **JavaScript (Vanilla)** - DOM manipulation and client-side logic
- **Single Page Application (SPA)** - Dynamic content loading without page refreshes

### Backend

- **Node.js** - Server-side runtime environment
- **Express.js** - Web application framework
- **RESTful APIs** - For data communication between frontend and backend

### Database

- **MongoDB** - NoSQL database with Mongoose ODM
- **Async/Await** - For handling asynchronous database operations

### Key FFSD Implementation Features

## 1. Form Validation using DOM (3 Marks)

✅ **Implemented**: All forms include comprehensive JavaScript DOM manipulation for validation:

### Registration Form Validation

- **Username validation**: Minimum 3 characters, alphanumeric and underscore only
- **Email validation**: Real-time email format checking using regex
- **Password validation**: Minimum 6 characters with uppercase, lowercase, and number requirements
- **Confirm password validation**: Real-time password matching
- **Real-time error display**: Dynamic error messages using DOM manipulation

### Login Form Validation

- **Email format validation**
- **Required field checks**
- **Dynamic error messaging**

### Contact Form Validation

- **Name validation**: Minimum 2 characters
- **Email format validation**
- **Subject validation**: Minimum 3 characters
- **Message validation**: Minimum 10 characters

**Location**: `/public/js/main-spa.js` (lines 75-150)

## 2. Dynamic HTML Implementation (3 Marks)

✅ **Implemented**: Extensive dynamic HTML elements responding to user interactions:

### Single Page Application (SPA)

- **Dynamic page switching**: Content changes without page refresh
- **Navigation management**: Dynamic showing/hiding of navigation elements
- **Content loading**: Pages load dynamically based on user actions

### Dynamic Content Rendering

- **Course listings**: Dynamically created course cards
- **Cart management**: Real-time cart updates and item rendering
- **User authentication state**: Navigation changes based on login status
- **Search results**: Dynamic filtering and display of courses

### Interactive Elements

- **Loading overlays**: Dynamic loading indicators
- **Notifications**: Toast notifications for user feedback
- **Form state management**: Dynamic form enabling/disabling
- **Content updates**: Real-time content updates without page refresh

**Location**: `/public/js/main-spa.js` (lines 150-300)

## 3. Data Handling with AJAX/Fetch API (5 Marks)

✅ **Implemented**: Comprehensive asynchronous data operations:

### Authentication Operations

- **Login API**: `/api/auth/login` - User authentication with session management
- **Registration API**: `/api/auth/register` - User registration with validation
- **Logout API**: `/api/auth/logout` - Session termination
- **Status Check API**: `/api/auth/status` - Authentication status verification

### Course Operations

- **Get all courses**: `/api/courses` - Fetch all available courses
- **Featured courses**: `/api/courses/featured` - Fetch featured courses for home page
- **Search courses**: `/api/courses/search?q=term` - Dynamic course searching

### Contact Operations

- **Contact form submission**: `/api/contact` - Async form submission with validation

### Cart Operations

- **Add to cart**: Client-side cart management with localStorage
- **Remove from cart**: Dynamic cart item removal
- **Checkout process**: Async checkout with enrollment

**Location**: `/public/js/main-spa.js` (lines 180-400)

## Project Structure

```
ffsd-project/
├── public/
│   ├── index.html              # Main SPA HTML file
│   ├── js/
│   │   ├── main-spa.js         # Core SPA functionality with DOM manipulation
│   │   ├── cart-spa.js         # Cart operations with AJAX
│   │   └── auth.js             # Authentication utilities
│   └── css/
│       └── styles.css          # Custom styles
├── controllers/
│   ├── auth.controller.js      # Authentication API endpoints
│   ├── course.controller.js    # Course API endpoints
│   └── [other controllers]
├── routes/
│   ├── api.routes.js          # API routes for SPA
│   └── [other routes]
├── models/
│   ├── User.js                # User data model
│   ├── Course.js              # Course data model
│   └── [other models]
├── server.js                  # Main server file
└── package.json               # Dependencies and scripts
```

## Key Features Demonstrating FFSD Concepts

### 1. Real-time Form Validation

- Input validation on blur and input events
- Dynamic error message display/hiding
- Form submission prevention on validation failure
- Visual feedback for validation states

### 2. Asynchronous Data Operations

- Fetch API for all server communications
- Promise-based error handling
- Loading states during async operations
- Response data processing and display

### 3. Dynamic User Interface

- Single Page Application architecture
- Content updates without page refresh
- Dynamic navigation state management
- Interactive elements with immediate feedback

### 4. Modern JavaScript Features

- ES6+ syntax (async/await, arrow functions, destructuring)
- DOM manipulation without jQuery
- Event-driven programming
- Module-based code organization

## Installation and Setup

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Start MongoDB**

   ```bash
   mongod
   ```

3. **Run the Application**

   ```bash
   npm start
   ```

4. **Access the Application**
   - SPA Version: `http://localhost:5000/`
   - Legacy EJS Version: `http://localhost:5000/legacy`

## API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/status` - Check authentication status

### Courses

- `GET /api/courses` - Get all courses
- `GET /api/courses/featured` - Get featured courses
- `GET /api/courses/search?q=term` - Search courses

### Contact

- `POST /api/contact` - Submit contact form

## FFSD Compliance Checklist

- ✅ **Form Validation using DOM**: Comprehensive client-side validation with DOM manipulation
- ✅ **Dynamic HTML Implementation**: SPA with dynamic content loading and user interactions
- ✅ **AJAX/Fetch API**: Extensive use of asynchronous data operations
- ✅ **JavaScript DOM Manipulation**: No external libraries, pure JavaScript DOM operations
- ✅ **Async/Await**: Modern asynchronous programming patterns
- ✅ **Error Handling**: Comprehensive error handling for all operations
- ✅ **User Experience**: Loading states, notifications, and real-time feedback

## Development Notes

This project successfully transforms a traditional server-rendered application into a modern FFSD-compliant Single Page Application while maintaining all existing functionality and adding new interactive features that demonstrate mastery of full-stack development concepts.

The implementation focuses on:

- Clean separation of concerns
- Modern JavaScript best practices
- Comprehensive error handling
- User-friendly interface design
- Scalable architecture patterns
