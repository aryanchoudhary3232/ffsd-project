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
        grid.appendChild(createCourseCard(course, 'View Course', null, true));
    });

    container.innerHTML = '';
    container.appendChild(grid);
}

function createCourseCard(course, buttonText, buttonLink = null, useModal = false) {
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
            ${useModal ? `
                <button onclick="viewCourseDetails('${courseId}')" class="block w-full text-center bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-700 ${courseId ? '' : 'opacity-50 cursor-not-allowed'}" ${courseId ? '' : 'disabled'}>
                    ${buttonText}
                </button>
            ` : `
                <a href="${link}" class="block w-full text-center bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-700 ${courseId ? '' : 'opacity-50 cursor-not-allowed'}" ${courseId ? '' : 'tabindex="-1" aria-disabled="true"'}>
                    ${buttonText}
                </a>
            `}
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

// View course details in modal using fetch
async function viewCourseDetails(courseId) {
    const modal = document.getElementById('course-details-modal');
    const modalContent = document.getElementById('course-modal-content');
    
    // Show modal with loading state
    modal.classList.remove('hidden');
    modalContent.innerHTML = `
        <div class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p class="mt-2 text-gray-400">Loading course details...</p>
        </div>
    `;

    try {
        const response = await fetch(`/courses/api/${courseId}`);
        
        if (!response.ok) {
            throw new Error('Failed to load course details');
        }

        const data = await response.json();
        
        if (data.success) {
            displayCourseDetails(data);
        } else {
            throw new Error(data.message || 'Failed to load course details');
        }
    } catch (error) {
        console.error('Error loading course details:', error);
        modalContent.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-exclamation-circle text-red-500 text-4xl mb-4"></i>
                <p class="text-red-400">${error.message}</p>
                <button onclick="closeCourseModal()" class="mt-4 bg-gray-700 text-white px-6 py-2 rounded-md hover:bg-gray-600">
                    Close
                </button>
            </div>
        `;
    }
}

// Display course details in modal
function displayCourseDetails(data) {
    const { course, isEnrolled, progress } = data;
    const modalContent = document.getElementById('course-modal-content');
    
    // Calculate module and lesson counts
    const moduleCount = course.modules ? course.modules.length : 0;
    const lessonCount = course.modules ? course.modules.reduce((total, module) => 
        total + (module.lessons ? module.lessons.length : 0), 0) : 0;
    const videoCount = course.modules ? course.modules.reduce((total, module) => 
        total + (module.lessons ? module.lessons.filter(l => l.type === 'video').length : 0), 0) : 0;
    const resourceCount = course.modules ? course.modules.reduce((total, module) => 
        total + (module.lessons ? module.lessons.filter(l => l.type === 'pdf').length : 0), 0) : 0;
    
    modalContent.innerHTML = `
        <div class="space-y-6">
            <!-- Course Header -->
            <div>
                <img src="${course.thumbnail}" alt="${course.title}" class="w-full h-64 object-cover rounded-lg mb-4">
                <h2 class="text-3xl font-bold mb-2">${course.title}</h2>
                <p class="text-gray-400 mb-4">${course.description}</p>
                <div class="flex items-center gap-4 text-sm text-gray-400">
                    <span><i class="fas fa-user mr-1"></i>${course.instructor}</span>
                    <span><i class="fas fa-users mr-1"></i>${course.students} students</span>
                    <span><i class="fas fa-star text-yellow-500 mr-1"></i>${course.rating} rating</span>
                    <span class="bg-blue-600 text-white px-2 py-1 rounded">${course.category}</span>
                </div>
            </div>

            <!-- Course Stats -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-gray-800 p-4 rounded-lg text-center">
                    <i class="fas fa-book text-blue-500 text-2xl mb-2"></i>
                    <p class="text-2xl font-bold">${moduleCount}</p>
                    <p class="text-sm text-gray-400">Modules</p>
                </div>
                <div class="bg-gray-800 p-4 rounded-lg text-center">
                    <i class="fas fa-play-circle text-green-500 text-2xl mb-2"></i>
                    <p class="text-2xl font-bold">${videoCount}</p>
                    <p class="text-sm text-gray-400">Videos</p>
                </div>
                <div class="bg-gray-800 p-4 rounded-lg text-center">
                    <i class="fas fa-file-pdf text-red-500 text-2xl mb-2"></i>
                    <p class="text-2xl font-bold">${resourceCount}</p>
                    <p class="text-sm text-gray-400">Resources</p>
                </div>
                <div class="bg-gray-800 p-4 rounded-lg text-center">
                    <i class="fas fa-clock text-purple-500 text-2xl mb-2"></i>
                    <p class="text-2xl font-bold">${lessonCount}</p>
                    <p class="text-sm text-gray-400">Lessons</p>
                </div>
            </div>

            <!-- Course Modules -->
            <div>
                <h3 class="text-xl font-bold mb-4">Course Content</h3>
                <div class="space-y-2 max-h-96 overflow-y-auto">
                    ${course.modules && course.modules.length > 0 ? course.modules.map((module, index) => `
                        <div class="bg-gray-800 rounded-lg overflow-hidden">
                            <button onclick="toggleModuleContent(${index})" class="w-full p-4 flex justify-between items-center hover:bg-gray-700 transition-colors">
                                <h4 class="font-semibold text-left">${module.title}</h4>
                                <div class="flex items-center gap-2">
                                    <span class="text-sm text-gray-400">${module.lessons ? module.lessons.length : 0} lessons</span>
                                    <i class="fas fa-chevron-down module-icon-${index}"></i>
                                </div>
                            </button>
                            <div class="hidden module-content-${index} p-4 pt-0 space-y-2">
                                ${module.lessons && module.lessons.length > 0 ? module.lessons.map(lesson => `
                                    <div class="flex items-center gap-2 text-sm text-gray-300 pl-4">
                                        ${lesson.type === 'video' ? '<i class="fas fa-play-circle text-blue-500"></i>' : 
                                          lesson.type === 'pdf' ? '<i class="fas fa-file-pdf text-red-500"></i>' : 
                                          '<i class="fas fa-file-alt text-gray-500"></i>'}
                                        <span>${lesson.title}</span>
                                    </div>
                                `).join('') : '<p class="text-sm text-gray-400 pl-4">No lessons yet</p>'}
                            </div>
                        </div>
                    `).join('') : '<p class="text-gray-400">No modules added yet</p>'}
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-4">
                ${isEnrolled ? `
                    <a href="/courses/${course._id}/learn" class="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors text-center font-semibold">
                        <i class="fas fa-play mr-2"></i>Continue Learning
                    </a>
                ` : `
                    <a href="/courses/${course._id}" class="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors text-center font-semibold">
                        <i class="fas fa-info-circle mr-2"></i>View Full Details & Enroll
                    </a>
                `}
                <button onclick="closeCourseModal()" class="bg-gray-700 text-white py-3 px-6 rounded-lg hover:bg-gray-600 transition-colors font-semibold">
                    Close
                </button>
            </div>
        </div>
    `;
}

// Close course modal
function closeCourseModal() {
    const modal = document.getElementById('course-details-modal');
    modal.classList.add('hidden');
}

// Toggle module content in modal
function toggleModuleContent(index) {
    const content = document.querySelector(`.module-content-${index}`);
    const icon = document.querySelector(`.module-icon-${index}`);
    
    content.classList.toggle('hidden');
    
    if (content.classList.contains('hidden')) {
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
    } else {
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
    }
}

// Make functions globally accessible
window.viewCourseDetails = viewCourseDetails;
window.closeCourseModal = closeCourseModal;
window.toggleModuleContent = toggleModuleContent;
