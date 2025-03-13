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

// Order model
const OrderModel = {
  // Get all orders
  getAllOrders: () => {
    const data = readData()
    return data.orders
  },

  // Get order by ID
  getOrderById: (id) => {
    const data = readData()
    return data.orders.find((order) => order.id === id)
  },

  // Get orders by user
  getOrdersByUser: (userId) => {
    const data = readData()
    return data.orders.filter((order) => order.userId === userId)
  },

  // Create new order
  createOrder: (orderData) => {
    const data = readData()

    // Create new order
    const newOrder = {
      id: Date.now().toString(),
      userId: orderData.userId,
      courseId: orderData.courseId,
      amount: orderData.amount,
      paymentMethod: orderData.paymentMethod,
      status: orderData.status || "completed",
      createdAt: new Date().toISOString(),
    }

    // Add order to data
    data.orders.push(newOrder)
    writeData(data)

    return newOrder
  },

  // Update order status
  updateOrderStatus: (id, status) => {
    const data = readData()
    const orderIndex = data.orders.findIndex((order) => order.id === id)

    if (orderIndex === -1) {
      throw new Error("Order not found")
    }

    // Update status
    data.orders[orderIndex].status = status
    writeData(data)

    return data.orders[orderIndex]
  },

  // Get orders by course
  getOrdersByCourse: (courseId) => {
    const data = readData()
    return data.orders.filter((order) => order.courseId === courseId)
  },

  // Get total revenue
  getTotalRevenue: () => {
    const data = readData()
    return data.orders.filter((order) => order.status === "completed").reduce((sum, order) => sum + order.amount, 0)
  },

  // Get revenue by month
  getRevenueByMonth: () => {
    const data = readData()
    const orders = data.orders.filter((order) => order.status === "completed")

    // Get last 6 months
    const revenueByMonth = {}
    const now = new Date()

    for (let i = 0; i < 6; i++) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${month.getFullYear()}-${month.getMonth() + 1}`
      revenueByMonth[monthKey] = 0
    }

    // Calculate revenue for each month
    for (const order of orders) {
      const orderDate = new Date(order.createdAt)
      const monthKey = `${orderDate.getFullYear()}-${orderDate.getMonth() + 1}`

      if (revenueByMonth[monthKey] !== undefined) {
        revenueByMonth[monthKey] += order.amount
      }
    }

    // Format for chart
    return Object.entries(revenueByMonth)
      .map(([key, value]) => {
        const [year, month] = key.split("-")
        return {
          month: new Date(Number.parseInt(year), Number.parseInt(month) - 1, 1).toLocaleString("default", {
            month: "short",
          }),
          revenue: value,
        }
      })
      .reverse()
  },

  // Get recent orders
  getRecentOrders: (limit = 10) => {
    const data = readData()
    return data.orders
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit)
      .map((order) => {
        const user = data.users.find((u) => u.id === order.userId)
        const course = data.courses.find((c) => c.id === order.courseId)

        return {
          ...order,
          userName: user ? user.name : "Unknown User",
          courseTitle: course ? course.title : "Unknown Course",
        }
      })
  },
}

module.exports = OrderModel

