// Global state
let currentCourseData = null;
let currentLessonId = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Get course ID from URL
    const pathParts = window.location.pathname.split('/');
    const courseId = pathParts[2]; // /courses/:id/learn
    
    // Get lesson ID from query params
    const urlParams = new URLSearchParams(window.location.search);
    const lessonId = urlParams.get('lesson');
    
    await loadCourseLearningData(courseId, lessonId);
    
    // Setup event listeners
    setupSidebarToggle();
});

// Load course learning data
async function loadCourseLearningData(courseId, lessonId = null) {
    try {
        const url = `/courses/api/${courseId}/learn${lessonId ? `?lesson=${lessonId}` : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            } else if (response.status === 403) {
                alert('You are not enrolled in this course');
                window.location.href = `/courses/${courseId}`;
                return;
            }
            throw new Error('Failed to load course data');
        }
        
        const data = await response.json();
        
        if (data.success) {
            currentCourseData = data;
            currentLessonId = data.currentLesson._id;
            
            // Render all components
            renderHeader(data);
            renderSidebar(data);
            renderLesson(data);
            loadComments(courseId, currentLessonId);
        } else {
            throw new Error(data.message || 'Failed to load course data');
        }
    } catch (error) {
        console.error('Error loading course data:', error);
        showError('Failed to load course content. Please try again.');
    }
}

// Render header
function renderHeader(data) {
    document.getElementById('course-title').textContent = data.course.title;
    document.getElementById('progress-bar').style.width = `${data.progress}%`;
    document.getElementById('progress-text').textContent = `${data.progress}%`;
}

// Render sidebar with modules and lessons
function renderSidebar(data) {
    const { course, completedLessons } = data;
    const modulesContainer = document.getElementById('modules-container');
    const statsContainer = document.getElementById('course-stats');
    
    // Calculate stats
    const moduleCount = course.modules.length;
    const lessonCount = course.modules.reduce((total, m) => total + m.lessons.length, 0);
    const completedCount = completedLessons.length;
    
    statsContainer.innerHTML = `
        <span>${moduleCount} modules • </span>
        <span>${lessonCount} lessons • </span>
        <span>${completedCount} completed</span>
    `;
    
    // Render modules
    modulesContainer.innerHTML = course.modules.map((module, moduleIndex) => {
        const totalLessons = module.lessons.length;
        const completedModuleLessons = module.lessons.filter(lesson => 
            completedLessons.includes(getLessonId(lesson))
        ).length;
        const isModuleCompleted = totalLessons === completedModuleLessons && totalLessons > 0;
        
        return `
            <div class="p-4">
                <div class="flex justify-between items-center mb-2">
                    <h3 class="font-semibold">${escapeHtml(module.title)}</h3>
                    ${isModuleCompleted ? `
                        <span class="text-green-400 text-sm">
                            <i class="fas fa-check-circle"></i> Completed
                        </span>
                    ` : completedModuleLessons > 0 ? `
                        <span class="text-purple-400 text-sm">
                            ${completedModuleLessons}/${totalLessons}
                        </span>
                    ` : ''}
                </div>
                <div class="space-y-2 pl-2">
                    ${module.lessons.length > 0 ? module.lessons.map(lesson => {
                        const lessonId = getLessonId(lesson);
                        const isCompleted = completedLessons.includes(lessonId);
                        const isCurrent = currentLessonId === lessonId;
                        
                        return `
                            <a 
                                href="?lesson=${lessonId}" 
                                onclick="changLesson(event, '${lessonId}')"
                                class="flex items-center p-2 rounded-md ${isCurrent ? 'bg-purple-700 text-purple-200' : 'hover:bg-gray-700'}"
                            >
                                ${isCompleted ? `
                                    <i class="fas fa-check-circle text-green-400 mr-2"></i>
                                ` : lesson.type === 'video' ? `
                                    <i class="fas fa-play-circle text-gray-400 mr-2"></i>
                                ` : lesson.type === 'pdf' ? `
                                    <i class="fas fa-file-pdf text-red-400 mr-2"></i>
                                ` : lesson.type === 'quiz' ? `
                                    <i class="fas fa-question-circle text-purple-400 mr-2"></i>
                                ` : `
                                    <i class="fas fa-file-alt text-gray-400 mr-2"></i>
                                `}
                                <span class="${isCurrent ? 'font-medium' : ''}">
                                    ${escapeHtml(lesson.title)}
                                </span>
                                ${lesson.duration ? `
                                    <span class="ml-auto text-xs text-gray-400">${escapeHtml(lesson.duration)}</span>
                                ` : ''}
                            </a>
                        `;
                    }).join('') : `
                        <p class="text-gray-400 text-sm">No lessons in this module</p>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

// Render lesson content
function renderLesson(data) {
    const { course, currentLesson, completedLessons, courseId } = data;
    const lessonContent = document.getElementById('lesson-content');
    const lessonNavigation = document.getElementById('lesson-navigation');
    
    const lessonFile = currentLesson.file || currentLesson.url || currentLesson.resourceUrl || '';
    const isCompleted = completedLessons.includes(currentLessonId);
    
    // Get all lessons for navigation
    const allLessons = [];
    course.modules.forEach(module => {
        module.lessons.forEach(lesson => {
            allLessons.push(lesson);
        });
    });
    
    const currentIndex = allLessons.findIndex(l => getLessonId(l) === currentLessonId);
    const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
    const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;
    
    // Render lesson content based on type
    let contentHtml = '';
    
    if (currentLesson.type === 'video') {
        contentHtml = `
            <div class="aspect-video bg-black flex items-center justify-center">
                ${lessonFile ? `
                    <video 
                        controls 
                        id="lesson-video" 
                        class="w-full h-full" 
                        poster="${currentLesson.poster || '/img/video-poster.jpg'}"
                    >
                        <source src="${lessonFile}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                ` : `
                    <div class="text-white text-center p-8">
                        <i class="fas fa-film text-5xl mb-4"></i>
                        <p class="text-xl">Video coming soon</p>
                    </div>
                `}
            </div>
        `;
    } else if (currentLesson.type === 'pdf') {
        contentHtml = `
            <div class="aspect-video bg-gray-700 flex items-center justify-center p-8">
                <div class="text-center">
                    <i class="fas fa-file-pdf text-red-400 text-5xl mb-4"></i>
                    <h3 class="text-xl font-semibold mb-2">${escapeHtml(currentLesson.title)}</h3>
                    <p class="text-gray-300 mb-4">PDF document</p>
                    <a 
                        href="${lessonFile || '#'}" 
                        class="inline-flex items-center bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 transition-colors"
                        ${lessonFile ? 'download' : ''}
                    >
                        <i class="fas fa-download mr-2"></i> Download
                    </a>
                </div>
            </div>
        `;
    } else if (currentLesson.type === 'quiz') {
        contentHtml = `
            <div class="aspect-video bg-gray-700 flex items-center justify-center p-8">
                <div class="text-center">
                    <i class="fas fa-question-circle text-purple-400 text-5xl mb-4"></i>
                    <h3 class="text-xl font-semibold mb-2">${escapeHtml(currentLesson.title)}</h3>
                    <p class="text-gray-300 mb-4">Quiz</p>
                    <button 
                        class="inline-flex items-center bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 transition-colors"
                        onclick="startQuiz()"
                    >
                        <i class="fas fa-play mr-2"></i> Start Quiz
                    </button>
                </div>
            </div>
        `;
    } else {
        contentHtml = `
            <div class="bg-gray-700 p-6">
                <h3 class="text-xl font-semibold mb-4">${escapeHtml(currentLesson.title)}</h3>
                ${currentLesson.description ? `
                    <p class="text-gray-300 mb-4">${escapeHtml(currentLesson.description)}</p>
                ` : ''}
                ${lessonFile ? `
                    <a 
                        href="${lessonFile}" 
                        class="inline-flex items-center bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 transition-colors"
                        ${currentLesson.type === 'assignment' ? '' : 'download'}
                    >
                        <i class="fas fa-download mr-2"></i> Download Resource
                    </a>
                ` : ''}
            </div>
        `;
    }
    
    lessonContent.innerHTML = `
        ${contentHtml}
        <div class="p-6">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold">${escapeHtml(currentLesson.title)}</h2>
                ${isCompleted ? `
                    <span class="inline-flex items-center text-green-400">
                        <i class="fas fa-check-circle mr-1"></i> Completed
                    </span>
                ` : ''}
            </div>
            
            ${currentLesson.summary ? `
                <p class="text-gray-300 mb-4">${escapeHtml(currentLesson.summary)}</p>
            ` : currentLesson.description ? `
                <p class="text-gray-300 mb-4">${escapeHtml(currentLesson.description)}</p>
            ` : ''}
            
            ${currentLesson.highlights && currentLesson.highlights.length > 0 ? `
                <h3 class="text-lg font-semibold mb-2">Key Takeaways</h3>
                <ul class="list-disc list-inside text-gray-300 space-y-1">
                    ${currentLesson.highlights.map(h => `<li>${escapeHtml(h)}</li>`).join('')}
                </ul>
            ` : ''}
        </div>
    `;
    
    // Render navigation
    lessonNavigation.innerHTML = `
        ${prevLesson ? `
            <a 
                href="?lesson=${getLessonId(prevLesson)}" 
                onclick="changeLesson(event, '${getLessonId(prevLesson)}')"
                class="inline-flex items-center bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
            >
                <i class="fas fa-arrow-left mr-2"></i> Previous Lesson
            </a>
        ` : '<div></div>'}
        
        <div class="flex flex-wrap gap-2">
            ${!isCompleted ? `
                <button 
                    id="complete-lesson-btn"
                    class="inline-flex items-center bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 transition-colors"
                    onclick="markAsComplete()"
                >
                    <i class="fas fa-check mr-2"></i> Mark as Complete
                </button>
            ` : ''}
            
            ${nextLesson ? `
                <a 
                    href="?lesson=${getLessonId(nextLesson)}" 
                    onclick="changeLesson(event, '${getLessonId(nextLesson)}')"
                    class="inline-flex items-center bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 transition-colors"
                >
                    Next Lesson <i class="fas fa-arrow-right ml-2"></i>
                </a>
            ` : ''}
        </div>
    `;
}

// Change lesson
function changeLesson(event, lessonId) {
    event.preventDefault();
    const pathParts = window.location.pathname.split('/');
    const courseId = pathParts[2];
    
    // Update URL without reload
    const newUrl = `${window.location.pathname}?lesson=${lessonId}`;
    window.history.pushState({ lessonId }, '', newUrl);
    
    // Load new lesson data
    loadCourseLearningData(courseId, lessonId);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Mark lesson as complete
async function markAsComplete() {
    const pathParts = window.location.pathname.split('/');
    const courseId = pathParts[2];
    
    try {
        const response = await fetch(`/courses/${courseId}/lessons/${currentLessonId}/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to mark lesson as complete');
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Reload course data to update progress
            await loadCourseLearningData(courseId, currentLessonId);
            
            // Show success message
            showSuccess('Lesson marked as complete!');
        } else {
            throw new Error(data.message || 'Failed to mark lesson as complete');
        }
    } catch (error) {
        console.error('Error marking lesson as complete:', error);
        showError('Failed to mark lesson as complete. Please try again.');
    }
}

// Load comments
async function loadComments(courseId, lessonId) {
    const commentsContainer = document.getElementById('comments-container');
    commentsContainer.innerHTML = '<p class="text-gray-400">Loading comments...</p>';
    
    try {
        const response = await fetch(`/courses/${courseId}/lessons/${lessonId}/comments`);
        
        if (!response.ok) {
            throw new Error('Failed to load comments');
        }
        
        const data = await response.json();
        
        if (data.success && data.comments) {
            if (data.comments.length === 0) {
                commentsContainer.innerHTML = '<p class="text-gray-400">No comments yet. Be the first to comment!</p>';
            } else {
                commentsContainer.innerHTML = data.comments.map(comment => `
                    <div class="border-b border-gray-700 pb-4 mb-4 last:border-0">
                        <div class="flex items-center mb-2">
                            <div class="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center mr-2">
                                <span class="text-sm font-bold">${comment.username.charAt(0).toUpperCase()}</span>
                            </div>
                            <div>
                                <p class="font-semibold">${escapeHtml(comment.username)}</p>
                                <p class="text-xs text-gray-400">${comment.timestamp}</p>
                            </div>
                        </div>
                        <p class="text-gray-300">${escapeHtml(comment.comment)}</p>
                    </div>
                `).join('');
            }
        } else {
            commentsContainer.innerHTML = '<p class="text-gray-400">No comments yet.</p>';
        }
    } catch (error) {
        console.error('Error loading comments:', error);
        commentsContainer.innerHTML = '<p class="text-red-400">Failed to load comments.</p>';
    }
}

// Submit comment
async function submitComment() {
    const pathParts = window.location.pathname.split('/');
    const courseId = pathParts[2];
    const commentInput = document.getElementById('comment-input');
    const comment = commentInput.value.trim();
    
    if (!comment) {
        showError('Please enter a comment');
        return;
    }
    
    try {
        const response = await fetch(`/courses/${courseId}/lessons/${currentLessonId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ comment })
        });
        
        if (!response.ok) {
            throw new Error('Failed to submit comment');
        }
        
        const data = await response.json();
        
        if (data.success) {
            commentInput.value = '';
            await loadComments(courseId, currentLessonId);
            showSuccess('Comment posted successfully!');
        } else {
            throw new Error(data.message || 'Failed to submit comment');
        }
    } catch (error) {
        console.error('Error submitting comment:', error);
        showError('Failed to post comment. Please try again.');
    }
}

// Start quiz (placeholder)
function startQuiz() {
    alert('Quiz functionality coming soon!');
}

// Setup sidebar toggle for mobile
function setupSidebarToggle() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (sidebarToggle && sidebar && overlay) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('-translate-x-full');
            overlay.classList.toggle('hidden');
        });
        
        overlay.addEventListener('click', () => {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
        });
    }
}

// Helper functions
function getLessonId(lesson) {
    if (!lesson) return '';
    const rawId = lesson._id || lesson.id;
    if (!rawId) return '';
    if (typeof rawId === 'string') return rawId;
    if (typeof rawId.toHexString === 'function') return rawId.toHexString();
    if (typeof rawId.toString === 'function') return rawId.toString();
    return String(rawId);
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}

function showSuccess(message) {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function showError(message) {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Handle browser back/forward buttons
window.addEventListener('popstate', (event) => {
    if (event.state && event.state.lessonId) {
        const pathParts = window.location.pathname.split('/');
        const courseId = pathParts[2];
        loadCourseLearningData(courseId, event.state.lessonId);
    }
});
