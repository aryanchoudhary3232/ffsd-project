document.addEventListener('DOMContentLoaded', async () => {
    await loadDashboardData();
});

async function loadDashboardData() {
    const loading = document.getElementById('loading');
    const dashboardContent = document.getElementById('dashboard-content');
    const errorMessage = document.getElementById('error-message');

    try {
        // Show loading spinner
        loading.classList.remove('hidden');
        dashboardContent.classList.add('hidden');
        errorMessage.classList.add('hidden');

        // Fetch dashboard data
        const response = await fetch('/user/dashboard/data');
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            throw new Error('Failed to load dashboard data');
        }

        const data = await response.json();
        
        // Update stats
        updateStats(data);
        
        // Render courses sections
        renderContinueLearning(data.enrolledCourses);
        renderAllCourses(data.enrolledCourses);
        renderRecommendedCourses(data.recommendedCourses);

        // Hide loading, show content
        loading.classList.add('hidden');
        dashboardContent.classList.remove('hidden');

    } catch (error) {
        console.error('Dashboard loading error:', error);
        loading.classList.add('hidden');
        errorMessage.textContent = 'Failed to load dashboard. Please try again later.';
        errorMessage.classList.remove('hidden');
    }
}

function updateStats(data) {
    document.getElementById('enrolled-count').textContent = data.enrolledCourses.length;
    document.getElementById('completed-count').textContent = data.progress.completedCourses;
    document.getElementById('average-progress').textContent = data.progress.averageProgress + ' %';
}

function renderContinueLearning(courses) {
    const container = document.getElementById('continue-learning-container');
    const inProgressCourses = courses.filter(course => course.progress > 0 && course.progress < 100);

    if (inProgressCourses.length === 0) {
        container.innerHTML = '<p class="text-gray-400">You haven\'t started any courses yet. Browse our courses to get started!</p>';
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';

    inProgressCourses.forEach(course => {
        grid.appendChild(createCourseCard(course, 'Continue Learning'));
    });

    container.innerHTML = '';
    container.appendChild(grid);
}

function renderAllCourses(courses) {
    const container = document.getElementById('all-courses-container');

    if (courses.length === 0) {
        container.innerHTML = '<p class="text-gray-400">You haven\'t enrolled in any courses yet. Browse our courses to get started!</p>';
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';

    courses.forEach(course => {
        let buttonText = 'Continue Learning';
        if (course.progress === 0) {
            buttonText = 'Start Course';
        } else if (course.progress === 100) {
            buttonText = 'Review Course';
        }
        grid.appendChild(createCourseCard(course, buttonText));
    });

    container.innerHTML = '';
    container.appendChild(grid);
}

function renderRecommendedCourses(courses) {
    const container = document.getElementById('recommended-courses-container');

    if (!courses || courses.length === 0) {
        container.innerHTML = '<p class="text-gray-400">No recommendations available at this time.</p>';
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';

    courses.forEach(course => {
        const courseId = getCourseId(course);
        const link = courseId ? `/courses/${courseId}` : '#';
        grid.appendChild(createCourseCard(course, 'View Course', link));
    });

    container.innerHTML = '';
    container.appendChild(grid);
}

function createCourseCard(course, buttonText, buttonLink = null) {
    const card = document.createElement('div');
    card.className = 'bg-gray-800 text-white rounded-lg shadow-md overflow-hidden';

    const courseId = getCourseId(course);
    const link = buttonLink || (courseId ? `/courses/${courseId}/learn` : '#');
    const progress = typeof course.progress === 'number' ? course.progress : 0;

    card.innerHTML = `
        <img src="${course.thumbnail || '/img/default-course.jpg'}" alt="${course.title}" class="w-full h-40 object-cover">
        <div class="p-4">
            <h3 class="text-lg font-semibold mb-2">${course.title}</h3>
            <p class="text-gray-400 mb-2">${course.instructor || 'Instructor'}</p>
            ${typeof course.progress === 'number' ? `
                <div class="mb-2">
                    <div class="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>${progress}%</span>
                    </div>
                    <div class="w-full bg-gray-700 rounded-full h-2.5">
                        <div class="bg-blue-500 h-2.5 rounded-full" style="width: ${progress}%"></div>
                    </div>
                </div>
            ` : ''}
            <a href="${link}" class="block w-full text-center bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-700 ${courseId ? '' : 'opacity-50 cursor-not-allowed'}" ${courseId ? '' : 'tabindex="-1" aria-disabled="true"'}>
                ${buttonText}
            </a>
        </div>
    `;

    return card;
}

function getCourseId(course) {
    const rawId = course && course._id;
    if (!rawId) return null;

    if (typeof rawId === 'string') {
        return rawId;
    }

    if (typeof rawId === 'object') {
        if (typeof rawId.toString === 'function' && rawId.toString() !== '[object Object]') {
            return rawId.toString();
        }
        if (rawId.$oid) {
            return rawId.$oid;
        }
    }

    try {
        return String(rawId);
    } catch (_) {
        return null;
    }
}
