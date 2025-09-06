const { MongoClient } = require("mongodb");

// Sample courses data
const sampleCourses = [
  {
    title: "Complete Web Development Bootcamp",
    description:
      "Learn HTML, CSS, JavaScript, React, Node.js and MongoDB. Build 15+ projects including 3 real-world applications. Master modern web development from scratch.",
    price: 89.99,
    category: "web-development",
    difficulty: "beginner",
    duration: 60,
    instructorId: "instructor1",
    rating: 4.8,
    enrolledStudents: 1250,
    image: "/placeholder.jpg",
    createdAt: new Date("2024-01-15"),
    status: "active",
  },
  {
    title: "React Native Mobile App Development",
    description:
      "Build cross-platform mobile apps with React Native. Learn navigation, state management, API integration, and deploy to App Store and Google Play.",
    price: 79.99,
    category: "mobile-development",
    difficulty: "intermediate",
    duration: 45,
    instructorId: "instructor2",
    rating: 4.6,
    enrolledStudents: 890,
    image: "/placeholder.jpg",
    createdAt: new Date("2024-02-10"),
    status: "active",
  },
  {
    title: "Data Science with Python",
    description:
      "Master data analysis, visualization, and machine learning with Python. Learn pandas, numpy, matplotlib, seaborn, and scikit-learn.",
    price: 99.99,
    category: "data-science",
    difficulty: "intermediate",
    duration: 55,
    instructorId: "instructor3",
    rating: 4.7,
    enrolledStudents: 670,
    image: "/placeholder.jpg",
    createdAt: new Date("2024-01-20"),
    status: "active",
  },
  {
    title: "Machine Learning A-Z",
    description:
      "Complete hands-on machine learning course. Learn regression, classification, clustering, deep learning, and neural networks.",
    price: 129.99,
    category: "artificial-intelligence",
    difficulty: "advanced",
    duration: 80,
    instructorId: "instructor4",
    rating: 4.9,
    enrolledStudents: 450,
    image: "/placeholder.jpg",
    createdAt: new Date("2024-03-05"),
    status: "active",
  },
  {
    title: "Cybersecurity Fundamentals",
    description:
      "Learn ethical hacking, network security, cryptography, and security best practices. Protect systems and data from cyber threats.",
    price: 69.99,
    category: "cybersecurity",
    difficulty: "beginner",
    duration: 40,
    instructorId: "instructor5",
    rating: 4.5,
    enrolledStudents: 320,
    image: "/placeholder.jpg",
    createdAt: new Date("2024-02-25"),
    status: "active",
  },
  {
    title: "AWS Cloud Computing Essentials",
    description:
      "Master Amazon Web Services cloud platform. Learn EC2, S3, RDS, Lambda, and deploy scalable applications to the cloud.",
    price: 89.99,
    category: "cloud-computing",
    difficulty: "intermediate",
    duration: 50,
    instructorId: "instructor6",
    rating: 4.6,
    enrolledStudents: 780,
    image: "/placeholder.jpg",
    createdAt: new Date("2024-03-15"),
    status: "active",
  },
  {
    title: "Advanced JavaScript & ES6+",
    description:
      "Deep dive into modern JavaScript. Learn closures, promises, async/await, modules, destructuring, and advanced patterns.",
    price: 59.99,
    category: "web-development",
    difficulty: "advanced",
    duration: 35,
    instructorId: "instructor1",
    rating: 4.8,
    enrolledStudents: 950,
    image: "/placeholder.jpg",
    createdAt: new Date("2024-02-05"),
    status: "active",
  },
  {
    title: "Flutter Mobile Development",
    description:
      "Build beautiful cross-platform mobile apps with Flutter and Dart. Learn widgets, state management, and native features.",
    price: 74.99,
    category: "mobile-development",
    difficulty: "beginner",
    duration: 42,
    instructorId: "instructor2",
    rating: 4.4,
    enrolledStudents: 560,
    image: "/placeholder.jpg",
    createdAt: new Date("2024-03-20"),
    status: "active",
  },
  {
    title: "Python for Beginners",
    description:
      "Start your programming journey with Python. Learn syntax, data structures, functions, and build real projects.",
    price: 49.99,
    category: "data-science",
    difficulty: "beginner",
    duration: 30,
    instructorId: "instructor3",
    rating: 4.7,
    enrolledStudents: 1450,
    image: "/placeholder.jpg",
    createdAt: new Date("2024-01-10"),
    status: "active",
  },
  {
    title: "Docker & Kubernetes Mastery",
    description:
      "Master containerization and orchestration. Learn Docker, Kubernetes, microservices, and DevOps best practices.",
    price: 94.99,
    category: "cloud-computing",
    difficulty: "advanced",
    duration: 65,
    instructorId: "instructor6",
    rating: 4.8,
    enrolledStudents: 380,
    image: "/placeholder.jpg",
    createdAt: new Date("2024-03-10"),
    status: "active",
  },
  {
    title: "Free HTML & CSS Crash Course",
    description:
      "Get started with web development for free. Learn HTML5 and CSS3 fundamentals and build your first website.",
    price: 0,
    category: "web-development",
    difficulty: "beginner",
    duration: 15,
    instructorId: "instructor1",
    rating: 4.3,
    enrolledStudents: 2100,
    image: "/placeholder.jpg",
    createdAt: new Date("2024-01-05"),
    status: "active",
  },
  {
    title: "Blockchain Development",
    description:
      "Learn blockchain technology, smart contracts, and decentralized applications. Build on Ethereum and other platforms.",
    price: 149.99,
    category: "other",
    difficulty: "advanced",
    duration: 70,
    instructorId: "instructor4",
    rating: 4.5,
    enrolledStudents: 210,
    image: "/placeholder.jpg",
    createdAt: new Date("2024-03-25"),
    status: "active",
  },
];

async function addSampleCourses() {
  const client = new MongoClient("mongodb://localhost:27017");

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("seekho-bharat");
    const coursesCollection = db.collection("courses");

    // Clear existing courses (optional)
    // await coursesCollection.deleteMany({});

    // Add sample courses
    const result = await coursesCollection.insertMany(sampleCourses);
    console.log(`Inserted ${result.insertedCount} sample courses`);
  } catch (error) {
    console.error("Error adding sample courses:", error);
  } finally {
    await client.close();
  }
}

addSampleCourses();
