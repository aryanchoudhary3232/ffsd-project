// Home page fetch operations
document.addEventListener('DOMContentLoaded', () => {
  loadFeaturedCourses();
});

/**
 * Fetch and display featured courses
 */
async function loadFeaturedCourses() {
  const container = document.getElementById('featured-courses-container');
  
  try {
    // Fetch featured courses from API
    const response = await fetch('/api/featured-courses', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Check if response is ok
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Parse JSON response
    const result = await response.json();

    if (result.success && result.data) {
      // Clear loading skeleton
      container.innerHTML = '';

      // Check if courses exist
      if (result.data.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 col-span-full">No featured courses available at the moment.</p>';
        return;
      }

      // Render courses
      result.data.forEach(course => {
        const courseCard = createCourseCard(course);
        container.appendChild(courseCard);
      });

      // Trigger GSAP animation after courses are loaded
      if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.from('.course-card', {
          opacity: 0,
          y: 50,
          duration: 0.8,
          stagger: 0.2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '.course-card',
            start: 'top 80%',
          }
        });
      }
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Error loading featured courses:', error);
    container.innerHTML = `
      <div class="col-span-full text-center">
        <p class="text-red-500 mb-4">Failed to load courses. Please try again later.</p>
        <button onclick="loadFeaturedCourses()" class="btn btn-primary">Retry</button>
      </div>
    `;
  }
}

/**
 * Create a course card element
 * @param {Object} course - Course data
 * @returns {HTMLElement} - Course card element
 */
function createCourseCard(course) {
  const card = document.createElement('div');
  card.className = 'course-card';
  
  card.innerHTML = `
    <img src="${escapeHtml(course.thumbnail)}" alt="${escapeHtml(course.title)}" class="w-full h-48 object-cover rounded-t-lg">
    <div class="p-6">
      <div class="flex justify-between items-start mb-2">
        <h3 class="text-xl font-bold">${escapeHtml(course.title)}</h3>
        <span class="badge badge-primary">₹${parseFloat(course.price).toFixed(2)}</span>
      </div>
      <p class="text-gray-600 mb-4">${escapeHtml(course.instructor)}</p>
      <div class="flex justify-between items-center mb-4">
        <div class="flex items-center">
          <span class="text-yellow-500 mr-1">★</span>
          <span>${escapeHtml(course.rating)}</span>
          <span class="text-gray-500 ml-1">(${escapeHtml(course.students)})</span>
        </div>
        <span class="badge badge-secondary">${escapeHtml(course.category)}</span>
      </div>
      <a href="/courses/${escapeHtml(course._id)}" class="btn btn-primary w-full">View Course</a>
    </div>
  `;
  
  return card;
}

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}
