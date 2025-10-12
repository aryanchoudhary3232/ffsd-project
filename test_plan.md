# Test Plan

This document outlines the validation and async/database test cases for the following models: User, Course, Cart, Order, Rating, and Progress. Each section lists the test cases and their expected results.

---

## User Model

### Validation Tests
- **Reject empty email:** Should throw an error mentioning "Email".
- **Reject duplicate email:** Should throw an error mentioning "Email already in use".
- **Hash password on creation:** Created user should not have a plain password property.

### Async / DB Tests
- **Find user by email:** Should return user with matching email.
- **Update user:** Should update and return the user with new data.
- **Get all users:** Should return a non-empty array of users.
- **Get user count:** Should return a number greater than 0.
- **Delete user:** Should return true on successful deletion.
- **Authenticate invalid credentials:** Should return null.

### Enrollment Tests
- **Enroll user in course:** Should return true on first enrollment.
- **Prevent duplicate enrollment:** Should return false if already enrolled.

---

## Course Model

### Validation Tests
- **Invalid course id (get):** Should return null.
- **Invalid id on update:** Should throw error mentioning "Invalid course ID format".
- **Update non-existent course:** Should throw error mentioning "Course not found".

### Async / DB Tests
- **Get all courses:** Should return a non-empty array.
- **Get course by id:** Should return course with matching id.
- **Update course:** Should update and return the course.
- **Add module to course:** Should add and return the new module.
- **Add lesson to module:** Should add and return the new lesson.
- **Get featured courses:** Should return an array (possibly empty).
- **Mark course as featured:** Should update and return course with `featured: true`.
- **Get courses by instructor:** Should return array with correct instructorId.
- **Get courses by category:** Should return array with correct category.
- **Search courses:** Should return array with matching courses.
- **Get all categories:** Should include the test category.
- **Get all languages:** Should include the test language.
- **Get courses by language:** Should return array with correct language.
- **Get course count:** Should return a number greater than 0.
- **Get new courses:** Should return a non-empty array.
- **Update course enrollment:** Should update and return the course.
- **Delete course:** Should return true on successful deletion.

---

## Cart Model

### Validation Tests
- **Invalid userId:** Should throw error mentioning "Invalid ObjectId".
- **Non-existent course:** Should throw error mentioning "Course not found".

### Async / DB Tests
- **Add item to cart:** Should return success true and cartCount 1.
- **Prevent duplicate course:** Should throw error mentioning "Course already in cart".
- **Get cart with course details:** Should return cart with non-empty items and correct total.
- **Remove item from cart:** Should return success true and cart should be empty.
- **Clear cart:** Should return success true and cart should be empty.

---

## Order Model

### Validation Tests
- **Invalid order id:** Should return null.

### Async / DB Tests
- **Create new order:** Should return order with correct properties.
- **Get order by id:** Should return order with matching id.
- **Get all orders:** Should return a non-empty array.
- **Get orders by user:** Should return non-empty array with correct userId.
- **Update order status:** Should update and return order with new status.
- **Get orders by course:** Should return non-empty array with correct courseId.
- **Get total revenue:** Should return a number.
- **Get revenue by month:** Should return array of length 6 with month and revenue properties.
- **Get recent orders with details:** Should return array with userName and courseTitle if not empty.

---

## Rating Model

### Validation Tests
- **Missing userId or courseId:** Should throw error mentioning "User ID and Course ID are required".
- **Invalid rating value:** Should throw error mentioning "Rating must be between 1 and 5".
- **User not found:** Should throw error mentioning "User not found".
- **Course not found:** Should throw error mentioning "Course not found".

### Async / DB Tests
- **Add new rating:** Should return rating and review.
- **Update existing rating:** Should update and return new rating and review.
- **Get user rating for course:** Should return correct rating and review.
- **Get all ratings for course:** Should return non-empty array with rating property.
- **Update course average rating:** Should return object with averageRating and ratingCount.
- **Delete rating:** Should return true and subsequent get should return null.

---

## Progress Model

### Validation Tests
- **No progress exists:** Should return default progress with 0% and empty completedLessons.

### Async / DB Tests
- **Initialize progress:** Should return progress with 0% and empty completedLessons.
- **Mark lesson as complete:** Should add lesson, update progress, and not duplicate lessons.
- **Get user overall progress:** Should return completedCourses, inProgressCourses, and averageProgress.
- **Get course completion rate:** Should return a number between 0 and 100.

---