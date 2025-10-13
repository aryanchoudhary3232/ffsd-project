[README_quick.md](https://github.com/user-attachments/files/22866170/README_quick.md)
# Quick README - SeekhoBharat

- **Group ID:** 25
- **Project Title:** SeekhoBharat
- **SPOC:**  
  Name: SHREYAAN LOKE  
  Email: shreyaan.l23@iiits.in  
  Roll Number: S20230010224

## Team Members & Roles

1. **Landing Page:** Shreyaan  
2. **Navbar:** Sudhan  
3. **Footer:** Shreyaan  
4. **Courses Page:** Sudhan  
5. **Student Dashboard:** Shreyaan  
6. **Course Details:** Sudhan  
7. **Cart:** Shreyaan & Sudhan  
8. **Login/Register Page & MongoDB:** Anchal  
9. **Admin Dashboard:** Arun & Aryan (Backup)  
10. **Course Video Page:** Anchal  
11. **Instructor Dashboard:** Aryan  
12. **Manage Courses Dashboard:** Aryan  
13. **View Analytics & Users (Instructor):** Aryan & Arun  
14. **Create New Course:** Arun & Aryan  
15. **Profile:** Shreyaan

## How to Run (Local)

### Prerequisites

- [Node.js](https://nodejs.org/) v14+  
- [MongoDB](https://www.mongodb.com/) running locally

### Steps

1. Clone the repository:
```bash
git clone https://github.com/aryanchoudhary3232/ffsd-project.git
cd ffsd-project
```

2. Install dependencies:
```bash
npm install
```

3. Ensure MongoDB is running locally (`mongodb://localhost:27017/seekho-bharat`)  
   (Optional) Seed initial data using scripts in the `scripts/` folder.

4. Start the server:
```bash
npm start
```
Visit [http://localhost:5000](http://localhost:5000) in your browser.

## Key Files & Functions

- **Server & Routes:** `server.js`, `routes/` (Express endpoints)  
- **Controllers:** `controllers/` (handles requests and logic for courses, cart, auth, admin, instructor)  
- **Models:** `models/` (Course, User, Order, Progress, Rating, Comment, etc.)  
- **Middleware:** `middleware/` (authentication, validations)  
- **Views:** `views/` (EJS templates for all pages)  
- **Scripts:** `scripts/` (migrations, database setup)  
- **Validation & Dynamic Features:**  
  - Authentication validation in `middleware/auth.js`  
  - Course enrollment & progress tracking in `controllers/courseController.js`  
  - Cart operations in `controllers/cartController.js`  
  - Admin approvals in `controllers/adminController.js`  

## Demo Link & Exact Timestamps

- **Demo Link:** *(Insert hosted link if available)*  
- **Exact Timestamps:** *(Specify timestamps to show key features in the demo)*

## Evidence Locations

- `network_evidence/` — captures network requests and API responses  
- `git-logs.txt` — all commit history and development logs  
- Other supporting evidence can be included in project folder

## Technologies Used

- **Backend:** Node.js, Express.js, MongoDB  
- **Frontend:** EJS, Tailwind CSS, Vanilla JS  
- **Authentication & Security:** Express-session, bcryptjs  
- **File Handling:** Multer  
- **Deployment:** Vercel configuration included
