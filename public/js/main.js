// Mobile menu toggle
document.addEventListener("DOMContentLoaded", () => {
  const mobileMenuButton = document.getElementById("mobile-menu-button");
  const mobileMenu = document.getElementById("mobile-menu");

  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener("click", () => {
      mobileMenu.classList.toggle("hidden");
    });
  }

  // Check if GSAP is available
  if (typeof gsap !== "undefined") {
    // GSAP animations
    gsap.registerPlugin(ScrollTrigger);
    gsap.from(".hero h1", { opacity: 0, y: 50, duration: 1, delay: 0.5 });
    gsap.from(".hero p", { opacity: 0, y: 50, duration: 1, delay: 0.7 });
    gsap.from(".hero .btn", {
      opacity: 0,
      y: 50,
      duration: 1,
      delay: 0.9,
      stagger: 0.2,
    });

    if (typeof ScrollTrigger !== "undefined") {
      gsap.from(".course-card", {
        opacity: 0,
        y: 50,
        duration: 0.8,
        stagger: 0.2,
        scrollTrigger: {
          trigger: ".course-card",
          start: "top 80%",
        },
      });

      gsap.from(".category-card", {
        opacity: 0,
        scale: 0.8,
        duration: 0.8,
        stagger: 0.2,
        scrollTrigger: {
          trigger: ".category-card",
          start: "top 80%",
        },
      });

      gsap.from(".feature-card", {
        opacity: 0,
        y: 50,
        duration: 0.8,
        stagger: 0.2,
        scrollTrigger: {
          trigger: ".feature-card",
          start: "top 80%",
        },
      });

      gsap.from(".testimonial-card", {
        opacity: 0,
        x: -50,
        duration: 0.8,
        stagger: 0.2,
        scrollTrigger: {
          trigger: ".testimonial-card",
          start: "top 80%",
        },
      });
    }
  }
});

// Add to cart functionality
function addToCart(courseId) {
  fetch("/cart/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ courseId }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        // Update cart count in the UI
        const cartCount = document.getElementById("cart-count");
        if (cartCount) {
          cartCount.textContent = data.cartCount;
        }
        // Show success message
        alert("Course added to cart successfully!");
      } else {
        alert(data.message || "Failed to add course to cart");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("An error occurred while adding the course to cart");
    });
}

// Search functionality
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");

if (searchForm && searchInput) {
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const searchQuery = searchInput.value.trim();
    if (searchQuery) {
      window.location.href = `/courses?search=${encodeURIComponent(
        searchQuery
      )}`;
    }
  });
}

// Course filter functionality
const categoryFilter = document.getElementById("category-filter");
const sortFilter = document.getElementById("sort-filter");

function applyFilters() {
  const category = categoryFilter ? categoryFilter.value : "";
  const sort = sortFilter ? sortFilter.value : "";
  const searchParams = new URLSearchParams(window.location.search);

  if (category) searchParams.set("category", category);
  if (sort) searchParams.set("sort", sort);

  window.location.href = `/courses?${searchParams.toString()}`;
}

if (categoryFilter) {
  categoryFilter.addEventListener("change", applyFilters);
}

if (sortFilter) {
  sortFilter.addEventListener("change", applyFilters);
}

// Dark mode toggle
const darkModeToggle = document.getElementById("dark-mode-toggle");
if (darkModeToggle) {
  darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem(
      "darkMode",
      document.body.classList.contains("dark-mode")
    );
  });

  // Check for saved dark mode preference
  if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark-mode");
  }
}
