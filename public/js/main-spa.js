// Main JavaScript functionality with DOM manipulation and AJAX
let currentUser = null;
let currentPage = "home";

document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 SeekoBharat SPA DOMContentLoaded fired");

  // Check if required elements exist
  const loadingOverlay = document.getElementById("loading-overlay");
  const homePage = document.getElementById("home-page");

  if (!loadingOverlay) {
    console.error("❌ Loading overlay not found!");
  } else {
    console.log("✅ Loading overlay found");
  }

  if (!homePage) {
    console.error("❌ Home page not found!");
  } else {
    console.log("✅ Home page found");
  }

  // Initialize the app
  console.log("🔧 Initializing app...");
  initializeApp();

  // Set up event listeners
  console.log("🔧 Setting up event listeners...");
  setupEventListeners();

  // Check authentication status
  console.log("🔧 Checking auth status...");
  checkAuthStatus();

  // Load initial content
  console.log("🔧 Loading initial content...");
  showPage("home");

  console.log("✅ SeekoBharat SPA initialization complete");
});

// Initialize application
function initializeApp() {
  // Ensure loading overlay is visible initially
  showLoading();

  // Force hide loading after a short delay to ensure page is visible
  setTimeout(() => {
    hideLoading();
    console.log("🏁 App initialization completed, loading hidden");
  }, 500);

  // Also hide loading after a longer delay as backup
  setTimeout(() => {
    const overlay = document.getElementById("loading-overlay");
    if (overlay && !overlay.classList.contains("hidden")) {
      console.log("🔧 Backup: Force hiding loading overlay");
      overlay.classList.add("hidden");
    }
  }, 2000);
}

// Set up event listeners for forms and dynamic elements
function setupEventListeners() {
  // Login form
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  // Register form
  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);
  }

  // Contact form
  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", handleContactForm);
  }

  // Create course form
  const createCourseForm = document.getElementById("create-course-form");
  if (createCourseForm) {
    createCourseForm.addEventListener("submit", handleCreateCourse);
  }

  // Create user form
  const createUserForm = document.getElementById("create-user-form");
  if (createUserForm) {
    createUserForm.addEventListener("submit", handleCreateUser);
  }

  // Course search
  const courseSearch = document.getElementById("course-search");
  if (courseSearch) {
    courseSearch.addEventListener("input", debounce(filterCourses, 300));
  }

  // Real-time validation for registration form
  setupRealTimeValidation();
}

// Real-time form validation using DOM manipulation
function setupRealTimeValidation() {
  // Username validation
  const usernameInput = document.getElementById("register-username");
  if (usernameInput) {
    usernameInput.addEventListener("blur", validateUsername);
    usernameInput.addEventListener("input", clearError);
  }

  // Email validation
  const emailInputs = document.querySelectorAll('input[type="email"]');
  emailInputs.forEach((input) => {
    input.addEventListener("blur", validateEmail);
    input.addEventListener("input", clearError);
  });

  // Password validation
  const passwordInput = document.getElementById("register-password");
  if (passwordInput) {
    passwordInput.addEventListener("blur", validatePassword);
    passwordInput.addEventListener("input", clearError);
  }

  // Confirm password validation
  const confirmPasswordInput = document.getElementById(
    "register-confirm-password"
  );
  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener("blur", validateConfirmPassword);
    confirmPasswordInput.addEventListener("input", clearError);
  }
}

// Form validation functions
function validateUsername(event) {
  const username = event.target.value.trim();
  const errorElement = document.getElementById("register-username-error");

  if (username.length < 3) {
    showError(errorElement, "Username must be at least 3 characters long");
    return false;
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    showError(
      errorElement,
      "Username can only contain letters, numbers, and underscores"
    );
    return false;
  }

  clearError(event);
  return true;
}

function validateEmail(event) {
  const email = event.target.value.trim();
  const errorElement = document.getElementById(event.target.id + "-error");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showError(errorElement, "Please enter a valid email address");
    return false;
  }

  clearError(event);
  return true;
}

function validatePassword(event) {
  const password = event.target.value;
  const errorElement = document.getElementById("register-password-error");

  if (password.length < 6) {
    showError(errorElement, "Password must be at least 6 characters long");
    return false;
  }

  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    showError(
      errorElement,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    );
    return false;
  }

  clearError(event);
  return true;
}

function validateConfirmPassword(event) {
  const confirmPassword = event.target.value;
  const password = document.getElementById("register-password").value;
  const errorElement = document.getElementById(
    "register-confirm-password-error"
  );

  if (confirmPassword !== password) {
    showError(errorElement, "Passwords do not match");
    return false;
  }

  clearError(event);
  return true;
}

// Utility functions for error handling
function showError(element, message) {
  if (element) {
    console.log("🚨 Showing error:", message, "on element:", element.id);
    element.textContent = message;
    element.style.display = "block";
    element.style.color = "#dc3545";
    element.style.fontSize = "0.875rem";
    element.style.marginTop = "0.25rem";
  } else {
    console.error("❌ Error element not found for message:", message);
  }
}

function clearError(event) {
  const errorElement = document.getElementById(event.target.id + "-error");
  if (errorElement) {
    errorElement.textContent = "";
    errorElement.style.display = "none";
  }
}

// Page navigation using DOM manipulation
function showPage(pageName) {
  console.log("📄 Navigating to page:", pageName);

  // Ensure loading is hidden when switching pages
  hideLoading();

  // Hide all pages
  const pages = document.querySelectorAll(".page");
  console.log("📋 Found pages:", pages.length);
  pages.forEach((page) => {
    page.classList.add("hidden");
  });

  // Show selected page
  const targetPage = document.getElementById(pageName + "-page");
  if (targetPage) {
    targetPage.classList.remove("hidden");
    currentPage = pageName;
    console.log("✅ Successfully showed page:", pageName);

    // Load page-specific content
    loadPageContent(pageName);

    // Ensure the page is visible by checking body visibility
    document.body.style.visibility = "visible";
    document.body.style.opacity = "1";
  } else {
    console.error("❌ Page not found:", pageName + "-page");
    console.log(
      "Available pages:",
      Array.from(pages).map((p) => p.id)
    );

    // Fallback: try to show home page
    if (pageName !== "home") {
      console.log("🔄 Fallback: trying to show home page");
      showPage("home");
    }
  }
}

// Load page-specific content using AJAX
async function loadPageContent(pageName) {
  try {
    switch (pageName) {
      case "home":
        await loadFeaturedCourses();
        await loadHomeStats();
        break;
      case "courses":
        await loadAllCourses();
        break;
      case "dashboard":
        await loadDashboard();
        break;
      case "cart":
        await loadCart();
        break;
    }
  } catch (error) {
    console.error("Error loading page content:", error);
  }
}

// AJAX functions for data handling
async function loadFeaturedCourses() {
  try {
    showLoading();
    const response = await fetch("/api/courses/featured");
    const data = await response.json();

    if (data.success) {
      renderFeaturedCourses(data.courses);
    } else {
      console.error("Failed to load featured courses:", data.message);
    }
  } catch (error) {
    console.error("Error loading featured courses:", error);
  } finally {
    hideLoading();
  }
}

async function loadAllCourses(searchTerm = "") {
  try {
    showCoursesLoading();

    // Fetch all courses if we don't have them yet
    if (allCourses.length === 0) {
      const response = await fetch("/api/courses");
      const data = await response.json();

      if (data.success) {
        allCourses = data.courses;
        updateCourseCount(allCourses.length, allCourses.length);
      } else {
        console.error("Failed to load courses:", data.message);
        showNoCourses();
        return;
      }
    }

    // If there's a search term, filter immediately
    if (searchTerm) {
      document.getElementById("course-search").value = searchTerm;
    }

    // Apply current filters
    hideCoursesLoading();
    filterCourses();
  } catch (error) {
    console.error("Error loading courses:", error);
    hideCoursesLoading();
    showNoCourses();
  }
}

// DOM manipulation for rendering content
function renderFeaturedCourses(courses) {
  const container = document.getElementById("featured-courses");
  if (!container) return;

  container.innerHTML = "";

  if (courses.length === 0) {
    container.innerHTML =
      '<p class="text-center col-span-3">No featured courses available.</p>';
    return;
  }

  courses.forEach((course) => {
    const courseElement = createCourseElement(course);
    container.appendChild(courseElement);
  });
}

function renderCourses(courses, containerId = "courses-grid") {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  if (courses.length === 0) {
    container.innerHTML =
      '<p class="text-center col-span-3">No courses found.</p>';
    return;
  }

  courses.forEach((course) => {
    const courseElement = createCourseElement(course, true);
    container.appendChild(courseElement);
  });
}

function createCourseElement(course, showEnrollButton = false) {
  const div = document.createElement("div");

  // Format price
  const formattedPrice = course.price ? `$${course.price}` : "Free";

  // Truncate description for display
  const shortDescription =
    course.description && course.description.length > 100
      ? course.description.substring(0, 100) + "..."
      : course.description || "No description available";

  // Format created date
  const createdDate = course.createdAt
    ? new Date(course.createdAt).toLocaleDateString()
    : "";

  // Determine rating display
  const rating = course.rating || 0;
  const ratingStars =
    "★".repeat(Math.floor(rating)) + "☆".repeat(5 - Math.floor(rating));

  // Determine difficulty badge color
  const difficultyColors = {
    beginner: "bg-green-100 text-green-800",
    intermediate: "bg-yellow-100 text-yellow-800",
    advanced: "bg-red-100 text-red-800",
  };
  const difficultyColor =
    difficultyColors[course.difficulty] || "bg-gray-100 text-gray-800";

  if (coursesView === "list") {
    // List view layout
    div.className =
      "bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow";
    div.innerHTML = `
      <div class="flex">
        <img src="${course.image || "/placeholder.jpg"}" alt="${
      course.title
    }" class="w-48 h-32 object-cover flex-shrink-0">
        <div class="flex-1 p-6">
          <div class="flex justify-between items-start mb-2">
            <h3 class="text-xl font-semibold">${course.title}</h3>
            <span class="text-2xl font-bold text-indigo-600">${formattedPrice}</span>
          </div>
          <p class="text-gray-600 mb-3">${shortDescription}</p>
          <div class="flex items-center space-x-4 mb-3">
            ${
              course.difficulty
                ? `<span class="px-2 py-1 text-xs font-medium rounded ${difficultyColor}">${course.difficulty}</span>`
                : ""
            }
            ${
              course.category
                ? `<span class="text-sm text-gray-500">${course.category.replace(
                    "-",
                    " "
                  )}</span>`
                : ""
            }
            ${
              rating > 0
                ? `<span class="text-sm text-yellow-500">${ratingStars} (${rating})</span>`
                : ""
            }
            ${
              createdDate
                ? `<span class="text-sm text-gray-400">${createdDate}</span>`
                : ""
            }
          </div>
          <div class="flex justify-between items-center">
            <div class="text-sm text-gray-500">
              ${
                course.enrolledStudents
                  ? `${course.enrolledStudents} students enrolled`
                  : "New course"
              }
            </div>
            ${
              showEnrollButton
                ? `<button onclick="addToCart('${course._id}')" class="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 transition duration-300">
                   Add to Cart
                 </button>`
                : `<button onclick="viewCourse('${course._id}')" class="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 transition duration-300">
                   View Course
                 </button>`
            }
          </div>
        </div>
      </div>
    `;
  } else {
    // Grid view layout (default)
    div.className =
      "bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow";
    div.innerHTML = `
      <img src="${course.image || "/placeholder.jpg"}" alt="${
      course.title
    }" class="w-full h-48 object-cover">
      <div class="p-6">
        <div class="flex justify-between items-start mb-2">
          <h3 class="text-xl font-semibold line-clamp-1">${course.title}</h3>
          ${
            course.difficulty
              ? `<span class="px-2 py-1 text-xs font-medium rounded ${difficultyColor}">${course.difficulty}</span>`
              : ""
          }
        </div>
        <p class="text-gray-600 mb-4 line-clamp-3">${shortDescription}</p>
        <div class="flex items-center justify-between mb-4">
          ${
            rating > 0
              ? `<span class="text-sm text-yellow-500">${ratingStars} (${rating})</span>`
              : '<span class="text-sm text-gray-400">No ratings yet</span>'
          }
          ${
            course.category
              ? `<span class="text-sm text-gray-500">${course.category.replace(
                  "-",
                  " "
                )}</span>`
              : ""
          }
        </div>
        <div class="flex justify-between items-center">
          <span class="text-2xl font-bold text-indigo-600">${formattedPrice}</span>
          ${
            showEnrollButton
              ? `<button onclick="addToCart('${course._id}')" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition duration-300">
                 Add to Cart
               </button>`
              : `<button onclick="viewCourse('${course._id}')" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition duration-300">
                 View Course
               </button>`
          }
        </div>
        ${
          course.enrolledStudents
            ? `<div class="mt-2 text-sm text-gray-500">${course.enrolledStudents} students enrolled</div>`
            : ""
        }
      </div>
    `;
  }

  return div;
}

// Authentication functions
async function handleLogin(event) {
  event.preventDefault();

  console.log("🔐 Login attempt started");

  const form = event.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);

  console.log("📝 Login data:", {
    email: data.email,
    passwordLength: data.password?.length,
  });

  // Clear previous error messages
  document
    .querySelectorAll("#login-page .error, #login-page .success")
    .forEach((el) => {
      el.textContent = "";
      el.style.display = "none";
    });

  // Client-side validation
  if (!validateLoginForm(data)) {
    console.log("❌ Validation failed");
    return;
  }

  try {
    console.log("⏳ Showing loading state");
    showLoading();

    console.log("🌐 Making API request to /api/auth/login");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    console.log("📊 Response status:", response.status);
    const result = await response.json();
    console.log("📦 Response data:", result);

    if (result.success) {
      console.log(
        "✅ Login successful for user:",
        result.user.name,
        "Role:",
        result.user.role
      );

      currentUser = result.user;
      showSuccess(
        document.getElementById("login-success"),
        "Login successful! Redirecting..."
      );
      updateNavigation();

      // Route to appropriate dashboard based on user role
      const redirectDelay = 1500; // Reduced delay for better UX
      console.log("🔄 Redirecting in", redirectDelay, "ms");

      setTimeout(() => {
        let targetPage;
        switch (result.user.role) {
          case "admin":
            targetPage = "admin-dashboard";
            break;
          case "instructor":
            targetPage = "teacher-dashboard";
            break;
          case "student":
          default:
            targetPage = "student-dashboard";
            break;
        }
        console.log("🎯 Redirecting to:", targetPage);
        showPage(targetPage);
      }, redirectDelay);
    } else {
      console.log("❌ Login failed:", result.message);
      showError(document.getElementById("login-general-error"), result.message);
    }
  } catch (error) {
    console.error("💥 Login error:", error);
    showError(
      document.getElementById("login-general-error"),
      "An error occurred. Please try again."
    );
  } finally {
    hideLoading();
    console.log("🏁 Login process completed");
  }
}

async function handleRegister(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);

  // Client-side validation
  if (!validateRegistrationForm(data)) {
    return;
  }

  try {
    showLoading();
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (result.success) {
      // If API returns user, treat as logged in and redirect based on role
      if (result.user) {
        currentUser = result.user;
        updateNavigation();

        showSuccess(
          document.getElementById("register-success"),
          "Registration successful! Redirecting to your dashboard..."
        );

        const redirectDelay = 1200;
        setTimeout(() => {
          let targetPage;
          switch (currentUser.role) {
            case "admin":
              targetPage = "admin-dashboard";
              break;
            case "instructor":
              targetPage = "teacher-dashboard";
              break;
            case "student":
            default:
              targetPage = "student-dashboard";
              break;
          }
          showPage(targetPage);
        }, redirectDelay);
      } else {
        // Fallback: no user returned, ask user to login
        showSuccess(
          document.getElementById("register-success"),
          "Registration successful! Please login."
        );
        form.reset();
        setTimeout(() => showPage("login"), 1500);
      }
    } else {
      showError(
        document.getElementById("register-general-error"),
        result.message
      );
    }
  } catch (error) {
    console.error("Registration error:", error);
    showError(
      document.getElementById("register-general-error"),
      "An error occurred. Please try again."
    );
  } finally {
    hideLoading();
  }
}

function validateLoginForm(data) {
  let isValid = true;

  console.log("🔍 Validating login form data:", data);

  // Clear previous errors
  document.querySelectorAll("#login-page .error").forEach((el) => {
    el.textContent = "";
    el.style.display = "none";
  });

  if (!data.email || data.email.trim() === "") {
    console.log("❌ Email validation failed");
    showError(
      document.getElementById("login-email-error"),
      "Email is required"
    );
    isValid = false;
  } else if (!isValidEmail(data.email)) {
    console.log("❌ Email format validation failed");
    showError(
      document.getElementById("login-email-error"),
      "Please enter a valid email address"
    );
    isValid = false;
  }

  if (!data.password || data.password.trim() === "") {
    console.log("❌ Password validation failed");
    showError(
      document.getElementById("login-password-error"),
      "Password is required"
    );
    isValid = false;
  }

  console.log("✅ Form validation result:", isValid);
  return isValid;
}

// Helper function to validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateRegistrationForm(data) {
  let isValid = true;

  // Clear previous errors
  document.querySelectorAll(".error").forEach((el) => (el.textContent = ""));

  if (!data.username || data.username.length < 3) {
    showError(
      document.getElementById("register-username-error"),
      "Username must be at least 3 characters"
    );
    isValid = false;
  }

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    showError(
      document.getElementById("register-email-error"),
      "Please enter a valid email"
    );
    isValid = false;
  }

  if (!data.password || data.password.length < 6) {
    showError(
      document.getElementById("register-password-error"),
      "Password must be at least 6 characters"
    );
    isValid = false;
  }

  if (data.password !== data.confirmPassword) {
    showError(
      document.getElementById("register-confirm-password-error"),
      "Passwords do not match"
    );
    isValid = false;
  }

  return isValid;
}

// Contact form handling
async function handleContactForm(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);

  // Client-side validation
  if (!validateContactForm(data)) {
    return;
  }

  try {
    showLoading();
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (result.success) {
      showSuccess(
        document.getElementById("contact-success"),
        "Message sent successfully! We'll get back to you soon."
      );
      form.reset();
    } else {
      showError(
        document.getElementById("contact-general-error"),
        result.message
      );
    }
  } catch (error) {
    console.error("Contact form error:", error);
    showError(
      document.getElementById("contact-general-error"),
      "An error occurred. Please try again."
    );
  } finally {
    hideLoading();
  }
}

function validateContactForm(data) {
  let isValid = true;

  // Clear previous errors
  document
    .querySelectorAll("#contact-page .error")
    .forEach((el) => (el.textContent = ""));

  if (!data.name || data.name.trim().length < 2) {
    showError(
      document.getElementById("contact-name-error"),
      "Name must be at least 2 characters"
    );
    isValid = false;
  }

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    showError(
      document.getElementById("contact-email-error"),
      "Please enter a valid email"
    );
    isValid = false;
  }

  if (!data.subject || data.subject.trim().length < 3) {
    showError(
      document.getElementById("contact-subject-error"),
      "Subject must be at least 3 characters"
    );
    isValid = false;
  }

  if (!data.message || data.message.trim().length < 10) {
    showError(
      document.getElementById("contact-message-error"),
      "Message must be at least 10 characters"
    );
    isValid = false;
  }

  return isValid;
}

// Search functionality with debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function handleCourseSearch(event) {
  const searchTerm = event.target.value.trim();
  loadAllCourses(searchTerm);
}

// Utility functions
function showLoading() {
  const overlay = document.getElementById("loading-overlay");
  if (overlay) {
    console.log("⏳ Showing loading overlay");
    overlay.classList.remove("hidden");
  } else {
    console.error("❌ Loading overlay not found");
  }
}

function hideLoading() {
  const overlay = document.getElementById("loading-overlay");
  if (overlay) {
    console.log("✅ Hiding loading overlay");
    overlay.classList.add("hidden");
  } else {
    console.error("❌ Loading overlay not found");
  }
}

function showSuccess(element, message) {
  if (element) {
    console.log("✅ Showing success:", message, "on element:", element.id);
    element.textContent = message;
    element.style.display = "block";
    element.style.color = "#28a745";
    element.style.fontSize = "0.875rem";
    element.style.marginTop = "0.25rem";
  } else {
    console.error("❌ Success element not found for message:", message);
  }
}

// Navigation functions
function updateNavigation() {
  const authLinks = document.getElementById("auth-links");
  const userLinks = document.getElementById("user-links");

  if (currentUser) {
    authLinks.classList.add("hidden");
    userLinks.classList.remove("hidden");
  } else {
    authLinks.classList.remove("hidden");
    userLinks.classList.add("hidden");
  }
}

async function checkAuthStatus() {
  try {
    const response = await fetch("/api/auth/status");
    const data = await response.json();

    if (data.success && data.user) {
      currentUser = data.user;
      updateNavigation();
    }
  } catch (error) {
    console.error("Error checking auth status:", error);
  }
}

async function logout() {
  try {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    const data = await response.json();

    if (data.success) {
      currentUser = null;
      updateNavigation();
      showPage("home");
    }
  } catch (error) {
    console.error("Logout error:", error);
  }
}

// Cart and course functions (to be implemented)
async function addToCart(courseId) {
  // Implementation for adding to cart
  console.log("Adding course to cart:", courseId);
}

function viewCourse(courseId) {
  // Implementation for viewing course details
  console.log("Viewing course:", courseId);
}

async function loadDashboard() {
  if (!currentUser) {
    showPage("login");
    return;
  }

  // Route to appropriate dashboard based on user role
  switch (currentUser.role) {
    case "student":
      showPage("student-dashboard");
      await loadStudentDashboard();
      break;
    case "instructor":
      showPage("teacher-dashboard");
      await loadTeacherDashboard();
      break;
    case "admin":
      showPage("admin-dashboard");
      await loadAdminDashboard();
      break;
    default:
      showPage("student-dashboard");
      await loadStudentDashboard();
  }
}

// Student Dashboard Functions
async function loadStudentDashboard() {
  try {
    showLoading();

    // Set student name
    document.getElementById("student-name").textContent = currentUser.name;

    // Load student stats
    const response = await fetch("/api/student/stats");
    const data = await response.json();

    if (data.success) {
      document.getElementById("enrolled-count").textContent =
        data.stats.enrolled || 0;
      document.getElementById("completed-count").textContent =
        data.stats.completed || 0;
      document.getElementById("progress-count").textContent =
        data.stats.inProgress || 0;
      document.getElementById("certificates-count").textContent =
        data.stats.certificates || 0;
    }

    // Load enrolled courses
    await loadStudentEnrolledCourses();

    // Show default tab
    showStudentTab("enrolled");
  } catch (error) {
    console.error("Error loading student dashboard:", error);
  } finally {
    hideLoading();
  }
}

async function loadStudentEnrolledCourses() {
  try {
    const response = await fetch("/api/student/enrolled-courses");
    const data = await response.json();

    if (data.success) {
      renderStudentEnrolledCourses(data.courses);
    }
  } catch (error) {
    console.error("Error loading enrolled courses:", error);
  }
}

function renderStudentEnrolledCourses(courses) {
  const container = document.getElementById("student-enrolled-courses");
  if (!container) return;

  container.innerHTML = "";

  if (courses.length === 0) {
    container.innerHTML =
      '<p class="text-gray-600 col-span-3">No enrolled courses yet. <a href="#" onclick="showStudentTab(\'browse\')" class="text-indigo-600 hover:text-indigo-800">Browse courses</a> to get started!</p>';
    return;
  }

  courses.forEach((course) => {
    const courseElement = document.createElement("div");
    courseElement.className =
      "bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow";

    courseElement.innerHTML = `
      <img src="${course.image || "/placeholder.jpg"}" alt="${
      course.title
    }" class="w-full h-32 object-cover rounded mb-3">
      <h4 class="font-semibold text-lg mb-2">${course.title}</h4>
      <p class="text-gray-600 text-sm mb-3">${course.description}</p>
      <div class="mb-3">
        <div class="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>${course.progress || 0}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div class="bg-indigo-600 h-2 rounded-full" style="width: ${
            course.progress || 0
          }%"></div>
        </div>
      </div>
      <button onclick="continueCourse('${
        course._id
      }')" class="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700">
        Continue Learning
      </button>
    `;

    container.appendChild(courseElement);
  });
}

function showStudentTab(tabName) {
  // Hide all tab contents
  document.querySelectorAll(".student-tab-content").forEach((tab) => {
    tab.classList.add("hidden");
  });

  // Remove active class from all tabs
  document.querySelectorAll(".student-tab").forEach((tab) => {
    tab.classList.remove("active", "border-indigo-500", "text-indigo-600");
    tab.classList.add("border-transparent", "text-gray-500");
  });

  // Show selected tab content
  const selectedTabContent = document.getElementById(`student-${tabName}-tab`);
  if (selectedTabContent) {
    selectedTabContent.classList.remove("hidden");
  }

  // Add active class to selected tab
  const selectedTab =
    event?.target ||
    document.querySelector(`button[onclick="showStudentTab('${tabName}')"]`);
  if (selectedTab) {
    selectedTab.classList.add("active", "border-indigo-500", "text-indigo-600");
    selectedTab.classList.remove("border-transparent", "text-gray-500");
  }

  // Load content based on tab
  switch (tabName) {
    case "progress":
      loadStudentProgress();
      break;
    case "browse":
      loadStudentBrowseCourses();
      break;
  }
}

async function loadStudentProgress() {
  try {
    const response = await fetch("/api/student/progress");
    const data = await response.json();

    const container = document.getElementById("student-progress-content");
    container.innerHTML = "";

    if (data.success) {
      // Render progress data
      container.innerHTML = `
        <div class="space-y-4">
          ${data.progress
            .map(
              (course) => `
            <div class="bg-gray-50 p-4 rounded-lg">
              <div class="flex justify-between items-center mb-2">
                <h4 class="font-medium">${course.courseTitle}</h4>
                <span class="text-sm text-gray-600">${
                  course.progress
                }% Complete</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div class="bg-green-600 h-2 rounded-full" style="width: ${
                  course.progress
                }%"></div>
              </div>
              <p class="text-sm text-gray-600">Last accessed: ${new Date(
                course.lastAccessed
              ).toLocaleDateString()}</p>
            </div>
          `
            )
            .join("")}
        </div>
      `;
    }
  } catch (error) {
    console.error("Error loading student progress:", error);
  }
}

async function loadStudentBrowseCourses() {
  try {
    const response = await fetch("/api/courses");
    const data = await response.json();

    if (data.success) {
      const container = document.getElementById("student-browse-courses");
      container.innerHTML = "";

      data.courses.forEach((course) => {
        const courseElement = createCourseElement(course, true);
        container.appendChild(courseElement);
      });
    }
  } catch (error) {
    console.error("Error loading browse courses:", error);
  }
}

// Teacher Dashboard Functions
async function loadTeacherDashboard() {
  try {
    showLoading();

    // Set teacher name
    document.getElementById("teacher-name").textContent = currentUser.name;

    // Load teacher stats
    const response = await fetch("/api/instructor/stats");
    const data = await response.json();

    if (data.success) {
      document.getElementById("teacher-courses-count").textContent =
        data.stats.courses || 0;
      document.getElementById("teacher-students-count").textContent =
        data.stats.students || 0;
      document.getElementById("teacher-revenue").textContent = `$${
        data.stats.revenue || 0
      }`;
      document.getElementById("teacher-rating").textContent =
        data.stats.rating || "0.0";
    }

    // Load teacher courses
    await loadTeacherCourses();

    // Show default tab
    showTeacherTab("courses");
  } catch (error) {
    console.error("Error loading teacher dashboard:", error);
  } finally {
    hideLoading();
  }
}

async function loadTeacherCourses() {
  try {
    const response = await fetch("/api/instructor/courses");
    const data = await response.json();

    if (data.success) {
      renderTeacherCourses(data.courses);
    }
  } catch (error) {
    console.error("Error loading teacher courses:", error);
  }
}

function renderTeacherCourses(courses) {
  const container = document.getElementById("teacher-course-list");
  if (!container) return;

  container.innerHTML = "";

  if (courses.length === 0) {
    container.innerHTML =
      '<p class="text-gray-600">No courses created yet. <button onclick="showCreateCourseModal()" class="text-indigo-600 hover:text-indigo-800">Create your first course</button>!</p>';
    return;
  }

  courses.forEach((course) => {
    const courseElement = document.createElement("div");
    courseElement.className =
      "bg-white border rounded-lg p-4 flex items-center justify-between";

    courseElement.innerHTML = `
      <div class="flex items-center space-x-4">
        <img src="${course.image || "/placeholder.jpg"}" alt="${
      course.title
    }" class="w-16 h-16 object-cover rounded">
        <div>
          <h4 class="font-semibold text-lg">${course.title}</h4>
          <p class="text-gray-600 text-sm">${
            course.enrolledStudents || 0
          } students enrolled</p>
          <p class="text-green-600 font-medium">$${course.price}</p>
        </div>
      </div>
      <div class="flex space-x-2">
        <button onclick="editCourse('${
          course._id
        }')" class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
          Edit
        </button>
        <button onclick="viewCourseStats('${
          course._id
        }')" class="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
          Stats
        </button>
        <button onclick="deleteCourse('${
          course._id
        }')" class="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">
          Delete
        </button>
      </div>
    `;

    container.appendChild(courseElement);
  });
}

function showTeacherTab(tabName) {
  // Hide all tab contents
  document.querySelectorAll(".teacher-tab-content").forEach((tab) => {
    tab.classList.add("hidden");
  });

  // Remove active class from all tabs
  document.querySelectorAll(".teacher-tab").forEach((tab) => {
    tab.classList.remove("active", "border-indigo-500", "text-indigo-600");
    tab.classList.add("border-transparent", "text-gray-500");
  });

  // Show selected tab content
  const selectedTabContent = document.getElementById(`teacher-${tabName}-tab`);
  if (selectedTabContent) {
    selectedTabContent.classList.remove("hidden");
  }

  // Add active class to selected tab
  const selectedTab =
    event?.target ||
    document.querySelector(`button[onclick="showTeacherTab('${tabName}')"]`);
  if (selectedTab) {
    selectedTab.classList.add("active", "border-indigo-500", "text-indigo-600");
    selectedTab.classList.remove("border-transparent", "text-gray-500");
  }

  // Load content based on tab
  switch (tabName) {
    case "students":
      loadTeacherStudents();
      break;
    case "analytics":
      loadTeacherAnalytics();
      break;
  }
}

async function loadTeacherStudents() {
  try {
    const response = await fetch("/api/instructor/students");
    const data = await response.json();

    const container = document.getElementById("teacher-students-content");
    container.innerHTML = "";

    if (data.success) {
      container.innerHTML = `
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrolled Date</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${data.students
                .map(
                  (student) => `
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${
                    student.name
                  }</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${
                    student.courseTitle
                  }</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${
                    student.progress
                  }%</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(
                    student.enrolledDate
                  ).toLocaleDateString()}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `;
    }
  } catch (error) {
    console.error("Error loading teacher students:", error);
  }
}

async function loadTeacherAnalytics() {
  try {
    const response = await fetch("/api/instructor/analytics");
    const data = await response.json();

    const container = document.getElementById("teacher-analytics-content");
    container.innerHTML = "";

    if (data.success) {
      container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-white p-6 rounded-lg border">
            <h4 class="font-semibold mb-4">Course Performance</h4>
            <div class="space-y-3">
              ${data.analytics.coursePerformance
                .map(
                  (course) => `
                <div class="flex justify-between items-center">
                  <span class="text-sm">${course.title}</span>
                  <span class="text-sm font-medium">${course.students} students</span>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
          <div class="bg-white p-6 rounded-lg border">
            <h4 class="font-semibold mb-4">Revenue Overview</h4>
            <div class="text-2xl font-bold text-green-600 mb-2">$${
              data.analytics.totalRevenue
            }</div>
            <p class="text-sm text-gray-600">Total earnings this month</p>
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error("Error loading teacher analytics:", error);
  }
}

// Admin Dashboard Functions
async function loadAdminDashboard() {
  try {
    showLoading();

    // Set admin name
    document.getElementById("admin-name").textContent = currentUser.name;

    // Load admin stats
    const response = await fetch("/api/admin/stats");
    const data = await response.json();

    if (data.success) {
      document.getElementById("admin-users-count").textContent =
        data.stats.users || 0;
      document.getElementById("admin-courses-count").textContent =
        data.stats.courses || 0;
      document.getElementById("admin-revenue").textContent = `$${
        data.stats.revenue || 0
      }`;
      document.getElementById("admin-active-students").textContent =
        data.stats.activeStudents || 0;
      document.getElementById("admin-instructors-count").textContent =
        data.stats.instructors || 0;
    }

    // Load admin content
    await loadAdminUsers();

    // Show default tab
    showAdminTab("users");
  } catch (error) {
    console.error("Error loading admin dashboard:", error);
  } finally {
    hideLoading();
  }
}

async function loadAdminUsers() {
  try {
    const response = await fetch("/api/admin/users");
    const data = await response.json();

    if (data.success) {
      renderAdminUsers(data.users);
    }
  } catch (error) {
    console.error("Error loading admin users:", error);
  }
}

function renderAdminUsers(users) {
  const container = document.getElementById("admin-users-content");
  if (!container) return;

  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Join Date</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${users
            .map(
              (user) => `
            <tr>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${
                user.username
              }</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${
                user.email
              }</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeClass(
                  user.role
                )}">${user.role}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(
                user.joinDate
              ).toLocaleDateString()}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="editUser('${
                  user._id
                }')" class="text-indigo-600 hover:text-indigo-900 mr-3">Edit</button>
                <button onclick="deleteUser('${
                  user._id
                }')" class="text-red-600 hover:text-red-900">Delete</button>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function getRoleBadgeClass(role) {
  switch (role) {
    case "admin":
      return "bg-red-100 text-red-800";
    case "instructor":
      return "bg-blue-100 text-blue-800";
    case "student":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function showAdminTab(tabName) {
  // Hide all tab contents
  document.querySelectorAll(".admin-tab-content").forEach((tab) => {
    tab.classList.add("hidden");
  });

  // Remove active class from all tabs
  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.classList.remove("active", "border-indigo-500", "text-indigo-600");
    tab.classList.add("border-transparent", "text-gray-500");
  });

  // Show selected tab content
  const selectedTabContent = document.getElementById(`admin-${tabName}-tab`);
  if (selectedTabContent) {
    selectedTabContent.classList.remove("hidden");
  }

  // Add active class to selected tab
  const selectedTab =
    event?.target ||
    document.querySelector(`button[onclick="showAdminTab('${tabName}')"]`);
  if (selectedTab) {
    selectedTab.classList.add("active", "border-indigo-500", "text-indigo-600");
    selectedTab.classList.remove("border-transparent", "text-gray-500");
  }

  // Load content based on tab
  switch (tabName) {
    case "courses":
      loadAdminCourses();
      break;
    case "analytics":
      loadAdminAnalytics();
      break;
    case "settings":
      loadAdminSettings();
      break;
  }
}

async function loadAdminCourses() {
  try {
    const response = await fetch("/api/admin/courses");
    const data = await response.json();

    const container = document.getElementById("admin-courses-content");
    container.innerHTML = "";

    if (data.success) {
      container.innerHTML = `
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Instructor</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${data.courses
                .map(
                  (course) => `
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${
                    course.title
                  }</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${
                    course.instructorName
                  }</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${
                    course.enrolledStudents || 0
                  }</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$${
                    course.price
                  }</td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      course.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }">${course.status}</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="toggleCourseStatus('${
                      course._id
                    }')" class="text-indigo-600 hover:text-indigo-900 mr-3">${
                    course.status === "active" ? "Deactivate" : "Activate"
                  }</button>
                    <button onclick="deleteCourse('${
                      course._id
                    }')" class="text-red-600 hover:text-red-900">Delete</button>
                  </td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `;
    }
  } catch (error) {
    console.error("Error loading admin courses:", error);
  }
}

async function loadAdminAnalytics() {
  try {
    const response = await fetch("/api/admin/analytics");
    const data = await response.json();

    const container = document.getElementById("admin-analytics-content");
    container.innerHTML = "";

    if (data.success) {
      container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-white p-6 rounded-lg border">
            <h4 class="font-semibold mb-4">User Growth</h4>
            <div class="text-2xl font-bold text-blue-600 mb-2">${
              data.analytics.userGrowth
            }%</div>
            <p class="text-sm text-gray-600">Growth this month</p>
          </div>
          <div class="bg-white p-6 rounded-lg border">
            <h4 class="font-semibold mb-4">Revenue Growth</h4>
            <div class="text-2xl font-bold text-green-600 mb-2">${
              data.analytics.revenueGrowth
            }%</div>
            <p class="text-sm text-gray-600">Growth this month</p>
          </div>
          <div class="bg-white p-6 rounded-lg border">
            <h4 class="font-semibold mb-4">Popular Courses</h4>
            <div class="space-y-2">
              ${data.analytics.popularCourses
                .map(
                  (course) => `
                <div class="flex justify-between">
                  <span class="text-sm">${course.title}</span>
                  <span class="text-sm font-medium">${course.enrollments} enrollments</span>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
          <div class="bg-white p-6 rounded-lg border">
            <h4 class="font-semibold mb-4">Platform Health</h4>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-sm">Active Users</span>
                <span class="text-sm font-medium text-green-600">${
                  data.analytics.activeUsers
                }</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm">Course Completion Rate</span>
                <span class="text-sm font-medium text-blue-600">${
                  data.analytics.completionRate
                }%</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error("Error loading admin analytics:", error);
  }
}

function loadAdminSettings() {
  const container = document.getElementById("admin-settings-content");
  container.innerHTML = `
    <div class="space-y-6">
      <div class="bg-white p-6 rounded-lg border">
        <h4 class="font-semibold mb-4">Platform Settings</h4>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Platform Name</label>
            <input type="text" value="SeekoBharat" class="block w-full px-3 py-2 border border-gray-300 rounded-md">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Admin Email</label>
            <input type="email" value="admin@seekobharat.com" class="block w-full px-3 py-2 border border-gray-300 rounded-md">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Platform Fee (%)</label>
            <input type="number" value="10" min="0" max="100" class="block w-full px-3 py-2 border border-gray-300 rounded-md">
          </div>
          <button class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  `;
}

// Modal Functions
function showCreateCourseModal() {
  document.getElementById("create-course-modal").classList.remove("hidden");
}

function closeCreateCourseModal() {
  document.getElementById("create-course-modal").classList.add("hidden");
  document.getElementById("create-course-form").reset();
}

function showCreateUserModal() {
  document.getElementById("create-user-modal").classList.remove("hidden");
}

function closeCreateUserModal() {
  document.getElementById("create-user-modal").classList.add("hidden");
  document.getElementById("create-user-form").reset();
}

// Course and User Management Functions
function continueCourse(courseId) {
  // Implementation for continuing a course
  console.log("Continuing course:", courseId);
}

function editCourse(courseId) {
  // Implementation for editing a course
  console.log("Editing course:", courseId);
}

function deleteCourse(courseId) {
  if (confirm("Are you sure you want to delete this course?")) {
    // Implementation for deleting a course
    console.log("Deleting course:", courseId);
  }
}

function editUser(userId) {
  // Implementation for editing a user
  console.log("Editing user:", userId);
}

function deleteUser(userId) {
  if (confirm("Are you sure you want to delete this user?")) {
    // Implementation for deleting a user
    console.log("Deleting user:", userId);
  }
}

function toggleCourseStatus(courseId) {
  // Implementation for toggling course status
  console.log("Toggling course status:", courseId);
}

function exportCourses() {
  // Implementation for exporting course data
  console.log("Exporting courses...");
}

// Form Handlers
async function handleCreateCourse(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);

  try {
    showLoading();

    const response = await fetch("/api/courses/create", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      showSuccess(
        document.getElementById("create-course-success"),
        "Course created successfully!"
      );
      form.reset();
      setTimeout(() => {
        closeCreateCourseModal();
        // Reload appropriate dashboard content
        if (currentUser.role === "instructor") {
          loadTeacherCourses();
        } else if (currentUser.role === "admin") {
          loadAdminCourses();
        }
      }, 2000);
    } else {
      showError(document.getElementById("create-course-error"), data.message);
    }
  } catch (error) {
    console.error("Create course error:", error);
    showError(
      document.getElementById("create-course-error"),
      "An error occurred while creating the course."
    );
  } finally {
    hideLoading();
  }
}

async function handleCreateUser(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);

  try {
    showLoading();

    const response = await fetch("/api/admin/users/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (result.success) {
      showSuccess(
        document.getElementById("create-user-success"),
        "User created successfully!"
      );
      form.reset();
      setTimeout(() => {
        closeCreateUserModal();
        loadAdminUsers();
      }, 2000);
    } else {
      showError(document.getElementById("create-user-error"), result.message);
    }
  } catch (error) {
    console.error("Create user error:", error);
    showError(
      document.getElementById("create-user-error"),
      "An error occurred while creating the user."
    );
  } finally {
    hideLoading();
  }
}

async function loadCart() {
  // Implementation for loading cart
  console.log("Loading cart...");
}

// Course Management Functions
function openCourseModal(courseId = null) {
  const modal = document.getElementById("course-modal");
  const title = document.getElementById("course-modal-title");
  const submitText = document.getElementById("course-submit-text");
  const form = document.getElementById("course-form");

  if (courseId) {
    title.textContent = "Edit Course";
    submitText.textContent = "Update Course";
    loadCourseData(courseId);
  } else {
    title.textContent = "Create New Course";
    submitText.textContent = "Create Course";
    form.reset();
    document.getElementById("course-id").value = "";
  }

  loadInstructorsForSelect();
  modal.classList.remove("hidden");
}

function closeCourseModal() {
  const modal = document.getElementById("course-modal");
  modal.classList.add("hidden");

  // Clear form and errors
  const form = document.getElementById("course-form");
  form.reset();
  clearFormErrors("course-form");
}

async function loadInstructorsForSelect() {
  try {
    const response = await fetch("/api/admin/users");
    const result = await response.json();

    if (result.success) {
      const instructorSelect = document.getElementById("course-instructor");
      instructorSelect.innerHTML =
        '<option value="">Select Instructor</option>';

      const instructors = result.users.filter(
        (user) => user.role === "instructor"
      );
      instructors.forEach((instructor) => {
        const option = document.createElement("option");
        option.value = instructor._id;
        option.textContent = instructor.username;
        instructorSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Error loading instructors:", error);
  }
}

async function loadCourseData(courseId) {
  try {
    const response = await fetch(`/api/courses/${courseId}`);
    const result = await response.json();

    if (result.success) {
      const course = result.course;
      document.getElementById("course-id").value = courseId;
      document.getElementById("course-title").value = course.title || "";
      document.getElementById("course-category").value = course.category || "";
      document.getElementById("course-description").value =
        course.description || "";
      document.getElementById("course-price").value = course.price || "";
      document.getElementById("course-duration").value = course.duration || "";
      document.getElementById("course-difficulty").value =
        course.difficulty || "";
      document.getElementById("course-instructor").value =
        course.instructorId || "";
    }
  } catch (error) {
    console.error("Error loading course data:", error);
  }
}

async function submitCourseForm(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  const courseId = data.courseId;

  try {
    showLoading();

    const url = courseId ? `/api/courses/${courseId}` : "/api/courses/create";
    const method = courseId ? "PUT" : "POST";

    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (result.success) {
      const message = courseId
        ? "Course updated successfully!"
        : "Course created successfully!";
      showSuccess(document.getElementById("course-form-success"), message);

      setTimeout(() => {
        closeCourseModal();
        if (currentPage === "admin-dashboard") {
          loadAdminCourses();
        } else if (currentPage === "teacher-dashboard") {
          loadTeacherCourses();
        }
      }, 2000);
    } else {
      showError(document.getElementById("course-form-error"), result.message);
    }
  } catch (error) {
    console.error("Course form error:", error);
    showError(
      document.getElementById("course-form-error"),
      "An error occurred while saving the course."
    );
  } finally {
    hideLoading();
  }
}

async function deleteCourse(courseId, courseName) {
  if (
    !confirm(
      `Are you sure you want to delete the course "${courseName}"? This action cannot be undone.`
    )
  ) {
    return;
  }

  try {
    showLoading();

    const response = await fetch(`/api/courses/${courseId}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (result.success) {
      showSuccessMessage("Course deleted successfully!");
      if (currentPage === "admin-dashboard") {
        loadAdminCourses();
      } else if (currentPage === "teacher-dashboard") {
        loadTeacherCourses();
      }
    } else {
      showErrorMessage(result.message);
    }
  } catch (error) {
    console.error("Delete course error:", error);
    showErrorMessage("An error occurred while deleting the course.");
  } finally {
    hideLoading();
  }
}

function clearFormErrors(formId) {
  const form = document.getElementById(formId);
  if (form) {
    const errorElements = form.querySelectorAll(".error");
    errorElements.forEach((element) => {
      element.textContent = "";
      element.style.display = "none";
    });

    const successElements = form.querySelectorAll(".success");
    successElements.forEach((element) => {
      element.textContent = "";
      element.style.display = "none";
    });
  }
}

function showSuccessMessage(message) {
  // Create and show a temporary success message
  const alertDiv = document.createElement("div");
  alertDiv.className =
    "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50";
  alertDiv.textContent = message;

  document.body.appendChild(alertDiv);

  setTimeout(() => {
    alertDiv.remove();
  }, 3000);
}

function showErrorMessage(message) {
  // Create and show a temporary error message
  const alertDiv = document.createElement("div");
  alertDiv.className =
    "fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50";
  alertDiv.textContent = message;

  document.body.appendChild(alertDiv);

  setTimeout(() => {
    alertDiv.remove();
  }, 3000);
}

// Search courses by category
function searchCoursesByCategory(category) {
  showPage("courses");
  // Set the category filter
  setTimeout(() => {
    const categoryFilter = document.getElementById("course-category-filter");
    if (categoryFilter) {
      categoryFilter.value = category;
      filterCourses();
    }
  }, 100);
}

// Filter courses function
// Filter courses function
let allCourses = []; // Store all courses for client-side filtering
let coursesView = "grid"; // Track current view mode

async function filterCourses() {
  const searchTerm =
    document.getElementById("course-search")?.value.toLowerCase() || "";
  const category =
    document.getElementById("course-category-filter")?.value || "";
  const difficulty =
    document.getElementById("course-difficulty-filter")?.value || "";
  const sortBy = document.getElementById("course-sort")?.value || "newest";

  try {
    showCoursesLoading();

    // If we don't have all courses yet, fetch them
    if (allCourses.length === 0) {
      const response = await fetch("/api/courses");
      const data = await response.json();
      if (data.success) {
        allCourses = data.courses;
      }
    }

    // Filter courses
    let filteredCourses = [...allCourses];

    // Apply search filter
    if (searchTerm) {
      filteredCourses = filteredCourses.filter(
        (course) =>
          course.title.toLowerCase().includes(searchTerm) ||
          course.description.toLowerCase().includes(searchTerm) ||
          (course.category &&
            course.category.toLowerCase().includes(searchTerm))
      );
    }

    // Apply category filter
    if (category) {
      filteredCourses = filteredCourses.filter(
        (course) => course.category === category
      );
    }

    // Apply difficulty filter
    if (difficulty) {
      filteredCourses = filteredCourses.filter(
        (course) => course.difficulty === difficulty
      );
    }

    // Apply sorting
    filteredCourses = sortCourses(filteredCourses, sortBy);

    // Update course count
    updateCourseCount(filteredCourses.length, allCourses.length);

    // Render courses
    hideCoursesLoading();
    if (filteredCourses.length === 0) {
      showNoCourses();
    } else {
      renderCourses(filteredCourses, "courses-grid");
    }
  } catch (error) {
    console.error("Error filtering courses:", error);
    hideCoursesLoading();
    showNoCourses();
  }
}

function sortCourses(courses, sortBy) {
  switch (sortBy) {
    case "price-low":
      return courses.sort((a, b) => (a.price || 0) - (b.price || 0));
    case "price-high":
      return courses.sort((a, b) => (b.price || 0) - (a.price || 0));
    case "title":
      return courses.sort((a, b) => a.title.localeCompare(b.title));
    case "rating":
      return courses.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    case "oldest":
      return courses.sort(
        (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
      );
    case "newest":
    default:
      return courses.sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
  }
}

function clearFilters() {
  // Reset all filter inputs
  document.getElementById("course-search").value = "";
  document.getElementById("course-category-filter").value = "";
  document.getElementById("course-difficulty-filter").value = "";
  document.getElementById("course-sort").value = "newest";

  // Re-filter courses (which will show all courses)
  filterCourses();
}

function setCoursesView(view) {
  coursesView = view;
  const gridBtn = document.getElementById("grid-view");
  const listBtn = document.getElementById("list-view");
  const coursesGrid = document.getElementById("courses-grid");

  // Update button states
  gridBtn.classList.toggle("active", view === "grid");
  listBtn.classList.toggle("active", view === "list");

  // Update grid classes
  if (view === "grid") {
    coursesGrid.className =
      "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8";
  } else {
    coursesGrid.className = "space-y-4";
  }

  // Re-render courses with new view
  filterCourses();
}

function updateCourseCount(filtered, total) {
  const courseCount = document.getElementById("course-count");
  if (courseCount) {
    if (filtered === total) {
      courseCount.textContent = `Showing all ${total} courses`;
    } else {
      courseCount.textContent = `Showing ${filtered} of ${total} courses`;
    }
  }
}

function showCoursesLoading() {
  const loadingSkeleton = document.getElementById("courses-loading");
  const coursesGrid = document.getElementById("courses-grid");
  const noCoursesMessage = document.getElementById("no-courses-message");

  if (loadingSkeleton) loadingSkeleton.classList.remove("hidden");
  if (coursesGrid) coursesGrid.classList.add("hidden");
  if (noCoursesMessage) noCoursesMessage.classList.add("hidden");
}

function hideCoursesLoading() {
  const loadingSkeleton = document.getElementById("courses-loading");
  const coursesGrid = document.getElementById("courses-grid");

  if (loadingSkeleton) loadingSkeleton.classList.add("hidden");
  if (coursesGrid) coursesGrid.classList.remove("hidden");
}

function showNoCourses() {
  const noCoursesMessage = document.getElementById("no-courses-message");
  const coursesGrid = document.getElementById("courses-grid");

  if (noCoursesMessage) noCoursesMessage.classList.remove("hidden");
  if (coursesGrid) coursesGrid.classList.add("hidden");
}

// Load home page stats
async function loadHomeStats() {
  try {
    // For now, we'll use static stats since we don't have a specific API for public stats
    // In a real application, you'd create a public stats API endpoint
    const totalCoursesElement = document.getElementById("total-courses");
    const totalStudentsElement = document.getElementById("total-students");
    const totalInstructorsElement =
      document.getElementById("total-instructors");
    const completionRateElement = document.getElementById("completion-rate");

    if (totalCoursesElement) totalCoursesElement.textContent = "500+";
    if (totalStudentsElement) totalStudentsElement.textContent = "10,000+";
    if (totalInstructorsElement) totalInstructorsElement.textContent = "200+";
    if (completionRateElement) completionRateElement.textContent = "95%";
  } catch (error) {
    console.error("Error loading home stats:", error);
  }
}

// Loading overlay functions
// NOTE: Removed duplicate showLoading/hideLoading (earlier implementations with logging retained)
