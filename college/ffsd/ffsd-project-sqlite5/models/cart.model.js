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

// Cart model
const CartModel = {
  // Get user's cart
  getCart: (userId) => {
    const data = readData()
    return data.carts.find((cart) => cart.userId === userId) || { userId, items: [] }
  },

  // Add item to cart
  addToCart: (userId, courseId) => {
    const data = readData()

    // Check if course exists
    const course = data.courses.find((c) => c.id === courseId)
    if (!course) {
      throw new Error("Course not found")
    }

    // Check if user is already enrolled
    const user = data.users.find((u) => u.id === userId)
    if (user.enrolledCourses.includes(courseId)) {
      throw new Error("Already enrolled in this course")
    }

    // Find or create cart
    let cart = data.carts.find((c) => c.userId === userId)

    if (!cart) {
      cart = {
        userId,
        items: [],
      }
      data.carts.push(cart)
    }

    // Check if course is already in cart
    if (cart.items.some((item) => item.courseId === courseId)) {
      throw new Error("Course already in cart")
    }

    // Add to cart
    cart.items.push({
      courseId,
      addedAt: new Date().toISOString(),
    })

    writeData(data)
    return { success: true, cartCount: cart.items.length }
  },

  // Remove item from cart
  removeFromCart: (userId, courseId) => {
    const data = readData()
    const cartIndex = data.carts.findIndex((c) => c.userId === userId)

    if (cartIndex === -1) {
      throw new Error("Cart not found")
    }

    // Remove item
    data.carts[cartIndex].items = data.carts[cartIndex].items.filter((item) => item.courseId !== courseId)

    writeData(data)
    return { success: true }
  },

  // Get cart items with course details
  getCartWithCourses: (userId) => {
    const data = readData()
    const cart = data.carts.find((c) => c.userId === userId) || { items: [] }

    // Get cart items with course details
    const cartItems = cart.items.map((item) => {
      const course = data.courses.find((c) => c.id === item.courseId)
      return {
        ...item,
        course,
      }
    })

    // Calculate total
    const total = cartItems.reduce((sum, item) => sum + item.course.price, 0)

    return {
      items: cartItems,
      total,
    }
  },

  // Clear cart
  clearCart: (userId) => {
    const data = readData()
    data.carts = data.carts.filter((c) => c.userId !== userId)
    writeData(data)
    return { success: true }
  },
}

module.exports = CartModel

