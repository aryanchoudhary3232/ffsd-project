const fs = require("fs")
const path = require("path")

const dataPath = path.join(__dirname, "../data/data.json")

// Helper function to read data.json
function readData() {
  const rawData = fs.readFileSync(dataPath)
  return JSON.parse(rawData)
}

// Helper function to write to data.json
function writeData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2))
}

// Progress model
const ProgressModel = {
  // Get progress by user and course
  getProgress: (userId, courseId) => {
    const data = readData()
    return (
      data.progress.find((p) => p.userId === userId && p.courseId === courseId) || { progress: 0, completedLessons: [] }
    )
  },

  // Mark lesson as complete
  markLessonAsComplete: (userId, courseId, lessonId) => {
    const data = readData()
    const progressIndex = data.progress.findIndex((p) => p.userId === userId && p.courseId === courseId)

    if (progressIndex === -1) {
      // Initialize progress if not found
      data.progress.push({
        userId,
        courseId,
        progress: 0,
        completedLessons: [lessonId],
      })
    } else {
      // Add lesson to completed lessons if not already there
      if (!data.progress[progressIndex].completedLessons.includes(lessonId)) {
        data.progress[progressIndex].completedLessons.push(lessonId)

        // Calculate new progress percentage
        const course = data.courses.find((c) => c.id === courseId)
        const totalLessons = course.modules.reduce((total, module) => total + module.lessons.length, 0)

        const completedCount = data.progress[progressIndex].completedLessons.length
        const newProgress = Math.round((completedCount / totalLessons) * 100)

        data.progress[progressIndex].progress = newProgress
      }
    }

    writeData(data)
    return progressIndex === -1 ? data.progress[data.progress.length - 1] : data.progress[progressIndex]
  },

  // Get user's overall progress
  getUserOverallProgress: (userId) => {
    const data = readData()
    const userProgress = data.progress.filter((p) => p.userId === userId)

    if (userProgress.length === 0) {
      return { completedCourses: 0, inProgressCourses: 0, averageProgress: 0 }
    }

    const completedCourses = userProgress.filter((p) => p.progress === 100).length
    const inProgressCourses = userProgress.filter((p) => p.progress > 0 && p.progress < 100).length
    const averageProgress = userProgress.reduce((sum, p) => sum + p.progress, 0) / userProgress.length

    return {
      completedCourses,
      inProgressCourses,
      averageProgress: Math.round(averageProgress),
    }
  },

  // Get course completion rate
  getCourseCompletionRate: (courseId) => {
    const data = readData()
    const courseProgress = data.progress.filter((p) => p.courseId === courseId)

    if (courseProgress.length === 0) {
      return 0
    }

    const completedCount = courseProgress.filter((p) => p.progress === 100).length
    return Math.round((completedCount / courseProgress.length) * 100)
  },
}

module.exports = ProgressModel

