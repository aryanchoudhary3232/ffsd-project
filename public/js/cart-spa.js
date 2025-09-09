// Cart operations with AJAX and DOM manipulation
let cart = [];

// Initialize cart from localStorage
document.addEventListener("DOMContentLoaded", function () {
  loadCartFromStorage();
  updateCartDisplay();
});

// Add item to cart using AJAX
async function addToCart(courseId) {
  try {
    showLoading();

    // Check if already in cart
    if (cart.find((item) => item.courseId === courseId)) {
      alert("Course is already in your cart!");
      return;
    }

    // Fetch course details
    const response = await fetch(`/api/courses/${courseId}`);
    const data = await response.json();

    if (data.success) {
      const cartItem = {
        courseId: courseId,
        title: data.course.title,
        price: data.course.price,
        image: data.course.image,
        description: data.course.description,
      };

      cart.push(cartItem);
      saveCartToStorage();
      updateCartDisplay();

      // Show success message with DOM manipulation
      showCartNotification("Course added to cart successfully!");
    } else {
      alert("Error adding course to cart");
    }
  } catch (error) {
    console.error("Add to cart error:", error);
    alert("Error adding course to cart");
  } finally {
    hideLoading();
  }
}

// Remove item from cart
function removeFromCart(courseId) {
  cart = cart.filter((item) => item.courseId !== courseId);
  saveCartToStorage();
  updateCartDisplay();
  showCartNotification("Course removed from cart");
}

// Update cart display using DOM manipulation
function updateCartDisplay() {
  const cartCount = document.getElementById("cart-count");
  const cartItems = document.getElementById("cart-items");
  const cartTotal = document.getElementById("cart-total");

  // Update cart count in navigation
  if (cartCount) {
    cartCount.textContent = cart.length;
    cartCount.style.display = cart.length > 0 ? "inline" : "none";
  }

  // Update cart page content
  if (cartItems) {
    renderCartItems();
  }

  // Update total
  if (cartTotal) {
    const total = calculateTotal();
    cartTotal.textContent = `$${total.toFixed(2)}`;
  }
}

// Render cart items with DOM manipulation
function renderCartItems() {
  const container = document.getElementById("cart-content");
  if (!container) return;

  container.innerHTML = "";

  if (cart.length === 0) {
    container.innerHTML = `
            <div class="text-center py-8">
                <h3 class="text-xl text-gray-600">Your cart is empty</h3>
                <button onclick="showPage('courses')" class="mt-4 bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700">
                    Browse Courses
                </button>
            </div>
        `;
    return;
  }

  const cartHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-2xl font-bold mb-6">Your Cart (${
              cart.length
            } items)</h2>
            <div class="space-y-4">
                ${cart
                  .map(
                    (item) => `
                    <div class="flex items-center justify-between border-b pb-4">
                        <div class="flex items-center space-x-4">
                            <img src="${
                              item.image || "/placeholder.jpg"
                            }" alt="${
                      item.title
                    }" class="w-16 h-16 object-cover rounded">
                            <div>
                                <h3 class="font-semibold">${item.title}</h3>
                                <p class="text-gray-600 text-sm">${
                                  item.description
                                }</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-4">
                            <span class="text-xl font-bold text-indigo-600">$${
                              item.price
                            }</span>
                            <button onclick="removeFromCart('${
                              item.courseId
                            }')" class="text-red-600 hover:text-red-800">
                                Remove
                            </button>
                        </div>
                    </div>
                `
                  )
                  .join("")}
            </div>
            <div class="mt-6 pt-6 border-t">
                <div class="flex justify-between items-center mb-4">
                    <span class="text-xl font-bold">Total: $<span id="cart-total">${calculateTotal().toFixed(
                      2
                    )}</span></span>
                </div>
                <div class="flex space-x-4">
                    <button onclick="clearCart()" class="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600">
                        Clear Cart
                    </button>
                    <button onclick="proceedToCheckout()" class="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700">
                        Proceed to Checkout
                    </button>
                </div>
            </div>
        </div>
    `;

  container.innerHTML = cartHTML;
}

// Calculate total price
function calculateTotal() {
  return cart.reduce((total, item) => total + parseFloat(item.price), 0);
}

// Clear entire cart
function clearCart() {
  if (confirm("Are you sure you want to clear your cart?")) {
    cart = [];
    saveCartToStorage();
    updateCartDisplay();
    showCartNotification("Cart cleared");
  }
}

// Proceed to checkout
async function proceedToCheckout() {
  if (cart.length === 0) {
    alert("Your cart is empty!");
    return;
  }

  if (!currentUser) {
    alert("Please login to proceed to checkout");
    showPage("login");
    return;
  }

  try {
    showLoading();

    const response = await fetch("/api/cart/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: cart,
        total: calculateTotal(),
      }),
    });

    const data = await response.json();

    if (data.success) {
      cart = [];
      saveCartToStorage();
      updateCartDisplay();
      alert("Checkout successful! You have been enrolled in the courses.");
      showPage("dashboard");
    } else {
      alert("Checkout failed: " + data.message);
    }
  } catch (error) {
    console.error("Checkout error:", error);
    alert("Checkout failed. Please try again.");
  } finally {
    hideLoading();
  }
}

// Local storage operations
function saveCartToStorage() {
  localStorage.setItem("seekho-bharat-cart", JSON.stringify(cart));
}

function loadCartFromStorage() {
  const savedCart = localStorage.getItem("seekho-bharat-cart");
  if (savedCart) {
    cart = JSON.parse(savedCart);
  }
}

// Show cart notification
function showCartNotification(message) {
  // Create notification element
  const notification = document.createElement("div");
  notification.className =
    "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50";
  notification.textContent = message;

  // Add to page
  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.style.transform = "translateX(0)";
    notification.style.opacity = "1";
  }, 100);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.transform = "translateX(100%)";
    notification.style.opacity = "0";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Update navigation to show cart count
function updateCartCount() {
  let cartCountElement = document.getElementById("cart-count");

  if (!cartCountElement) {
    // Create cart count element if it doesn't exist
    const cartLink = document.querySelector("a[onclick=\"showPage('cart')\"]");
    if (cartLink) {
      cartCountElement = document.createElement("span");
      cartCountElement.id = "cart-count";
      cartCountElement.className =
        "bg-red-500 text-white text-xs rounded-full px-2 py-1 ml-1";
      cartLink.appendChild(cartCountElement);
    }
  }

  if (cartCountElement) {
    cartCountElement.textContent = cart.length;
    cartCountElement.style.display = cart.length > 0 ? "inline" : "none";
  }
}

// Initialize cart count in navigation
document.addEventListener("DOMContentLoaded", function () {
  updateCartCount();
});
