[README.md](https://github.com/user-attachments/files/22866086/README.md)
# SeekoBharat - Regional Language E-Learning Platform

SeekoBharat is a full-featured online learning platform focused on making courses available in **regional languages**. Students can access courses in their preferred language, track progress, and earn certificates. Instructors can teach from home, earn income, and manage their courses. Admins oversee content, users, and platform quality.

## Key Features

- **User Roles:** Student, Instructor, Admin  
- **Multilingual Courses:** Students can learn in regional languages  
- **Authentication:** Secure registration and login  
- **Course Management:** Instructors create courses; admin approval required before publishing  
- **Progress Tracking:** Students can track lesson completion and course progress  
- **Ratings & Reviews:** Students can rate and review courses  
- **Shopping Cart & Checkout:** Easy course purchase workflow  
- **Responsive UI:** Mobile-friendly design using Tailwind CSS and EJS  
- **Admin Dashboard:** Monitor users, courses, revenue, and platform analytics  
- **Instructor Dashboard:** Manage own courses, view student progress and analytics  

## Project Structure

- `config/` — Database configuration  
- `controllers/` — Logic for routes (admin, auth, cart, course, instructor, rating, user)  
- `data/` — Seed and persistent data (JSON/DB files)  
- `middleware/` — Authentication and other middleware  
- `models/` — Data models (Course, User, Order, Progress, Rating, Comment, etc.)  
- `public/` — Static assets (CSS, JS, images)  
- `routes/` — Express route definitions  
- `scripts/` — Utility scripts (migrations, index setup)  
- `views/` — EJS templates for all pages  
- `server.js` — Main Express server  
- `package.json` — Project metadata and dependencies  
- `README.md` — Project documentation  

## Technologies Used

- **Backend:** Node.js, Express.js, MongoDB (Mongoose & native driver)  
- **Frontend:** EJS, Tailwind CSS, Vanilla JS  
- **Authentication & Security:** Express-session, bcryptjs  
- **File Handling:** Multer for uploads  
- **Deployment:** Vercel configuration included  

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v14+  
- [MongoDB](https://www.mongodb.com/) running locally  

### Installation

1. Clone the repository:
```bash
git clone https://github.com/aryanchoudhary3232/ffsd-project.git
cd ffsd-project
```

2. Install dependencies:
```bash
npm install
```

3. Set up the database:  
Ensure MongoDB is running at `mongodb://localhost:27017/seekho-bharat`.  
(Optional) Seed initial data using scripts in the `scripts/` folder.

4. Start the server:
```bash
npm start
```
Visit [http://localhost:3000](http://localhost:3000) in your browser.

### Scripts

- Start server: `npm start`  
- Run migrations: `node scripts/migrate-users.js`  
- Initialize indexes: `node scripts/init-indexes.js`  

## Usage

- **Students:** Browse courses, enroll, track progress, and leave reviews  
- **Instructors:** Create/manage courses, upload content, view analytics  
- **Admins:** Approve courses, manage users, view platform stats
