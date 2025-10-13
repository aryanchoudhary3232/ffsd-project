document.addEventListener("DOMContentLoaded", function () {
  // Don't run cart operations on the learning page
  if (window.isLearningPage) {
    return;
  }

  // === Refresh Cart UI ===
  async function refreshCartUI() {
    // Only run cart operations on cart pages - use specific cart container IDs
    const cartItemsContainer = document.getElementById("cart-items-list");
    if (!cartItemsContainer) return; // Exit if not on cart page

    try {
      const response = await fetch("/cart", {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

<<<<<<< HEAD
      if (!response.ok) {
        throw new Error("Failed to fetch cart data");
=======
        if (data.cartItems.length > 0) {
          data.cartItems.forEach(function(item) {
            cartItemsContainer.append(`
              <div class="p-4 flex flex-col md:flex-row gap-4">
                <div class="md:w-1/4">
                  <img src="${item.course.thumbnail}" alt="${item.course.title}" class="w-full h-32 object-cover rounded-md">
                </div>
                <div class="md:w-2/4">
                  <h3 class="text-lg font-semibold mb-1">${item.course.title}</h3>
                  <p class="text-gray-400 mb-2">By ${item.course.instructor}</p>
                  <div class="flex items-center mb-2">
                    <span class="text-yellow-500 mr-1">★</span>
                    <span>${item.course.rating}</span>
                    <span class="text-gray-500 ml-1">(${item.course.students} students)</span>
                  </div>
                  <p class="text-sm text-gray-500">Added on ${new Date(item.addedAt).toLocaleDateString()}</p>
                </div>
                <div class="md:w-1/4 flex flex-col justify-between items-end">
                  <div class="text-xl font-bold">₹${item.course.price.toFixed(2)}</div>
                  <form action="/cart/remove" method="POST" class="mt-2 remove-from-cart-form">
                    <input type="hidden" name="courseId" value="${item.course._id}">
                    <button type="submit" class="text-red-400 hover:text-red-600">
                      <i class="fas fa-trash-alt mr-1"></i> Remove
                    </button>
                  </form>
                </div>
              </div>
            `);
          });
        }

        // Update totals
        $('#order-original-price').text(`₹${data.total.toFixed(2)}`);
        $('#order-total-price').text(`₹${data.total.toFixed(2)}`);

        // Update cart count
        $('#cart-items-heading').text(`${data.cartItems.length} Course${data.cartItems.length !== 1 ? 's' : ''} in Cart`);
>>>>>>> origin/main
      }

      const data = await response.json();

      if (!data.success) return;

      cartItemsContainer.innerHTML = "";

      if (data.cartItems.length > 0) {
        data.cartItems.forEach(function (item) {
          const itemDiv = document.createElement("div");
          itemDiv.className = "p-4 flex flex-col md:flex-row gap-4";
          itemDiv.innerHTML = `
            <div class="md:w-1/4">
              <img src="${item.course.thumbnail}" alt="${
            item.course.title
          }" class="w-full h-32 object-cover rounded-md">
            </div>
            <div class="md:w-2/4">
              <h3 class="text-lg font-semibold mb-1">${item.course.title}</h3>
              <p class="text-gray-400 mb-2">By ${item.course.instructor}</p>
              <div class="flex items-center mb-2">
                <span class="text-yellow-500 mr-1">★</span>
                <span>${item.course.rating}</span>
                <span class="text-gray-500 ml-1">(${
                  item.course.students
                } students)</span>
              </div>
              <p class="text-sm text-gray-500">Added on ${new Date(
                item.addedAt
              ).toLocaleDateString()}</p>
            </div>
            <div class="md:w-1/4 flex flex-col justify-between items-end">
              <div class="text-xl font-bold">$${item.course.price.toFixed(
                2
              )}</div>
              <form action="/cart/remove" method="POST" class="mt-2 remove-from-cart-form">
                <input type="hidden" name="courseId" value="${item.course._id}">
                <button type="submit" class="text-red-400 hover:text-red-600">
                  <i class="fas fa-trash-alt mr-1"></i> Remove
                </button>
              </form>
            </div>
          `;
          cartItemsContainer.appendChild(itemDiv);
        });
      } else {
        const emptyDiv = document.createElement("div");
        emptyDiv.className =
          "bg-gray-800 rounded-lg shadow-md p-8 text-center w-full";
        emptyDiv.innerHTML = `
          <div class="text-gray-500 mb-4">
            <i class="fas fa-shopping-cart text-6xl"></i>
          </div>
          <h2 class="text-xl font-bold mb-2">Your cart is empty</h2>
          <p class="text-gray-500 mb-6">Looks like you haven't added any courses yet.</p>
          <a href="/courses" class="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition-colors">
            Browse Courses
          </a>
        `;
        cartItemsContainer.appendChild(emptyDiv);
      }

      // Update totals
      const originalPrice = document.getElementById("order-original-price");
      const totalPrice = document.getElementById("order-total-price");
      const cartHeading = document.getElementById("cart-items-heading");

      if (originalPrice)
        originalPrice.textContent = `$${data.total.toFixed(2)}`;
      if (totalPrice) totalPrice.textContent = `$${data.total.toFixed(2)}`;
      if (cartHeading) {
        cartHeading.textContent = `${data.cartItems.length} Course${
          data.cartItems.length !== 1 ? "s" : ""
        } in Cart`;
      }
    } catch (error) {
      console.error("Error refreshing cart:", error);
    }
  }

  // === ADD TO CART ===
  document.addEventListener("submit", async function (e) {
    const form = e.target;

    if (form.matches('form[action*="/cart/add"]')) {
      e.preventDefault();

      const submitButton = form.querySelector('button[type="submit"]');
      const originalText = submitButton.textContent;

      submitButton.disabled = true;
      submitButton.textContent = "Adding...";

      try {
        const formData = new FormData(form);
        const response = await fetch(form.action, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams(formData),
        });

        const data = await response.json();

        if (data.success) {
          alert("Course added to cart successfully!");
          await refreshCartUI();
        } else {
          alert(data.message || "Failed to add course to cart");
        }

        submitButton.disabled = false;
        submitButton.textContent = originalText;
      } catch (error) {
        console.error("Error:", error);
        alert("An error occurred while adding to cart");
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }

    // === REMOVE FROM CART ===
    if (
      form.matches(".remove-from-cart-form") ||
      form.matches('form[action*="/cart/remove"]')
    ) {
      e.preventDefault();

      const submitButton = form.querySelector('button[type="submit"]');
      const originalText = submitButton.textContent;

      submitButton.disabled = true;
      submitButton.textContent = "Removing...";

      try {
        const formData = new FormData(form);
        const response = await fetch(form.action, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams(formData),
        });

        const data = await response.json();

        if (data.success) {
<<<<<<< HEAD
          await refreshCartUI();
=======
          refreshCartUI();
          if (window.updateCartCount) window.updateCartCount();
>>>>>>> origin/main
        } else {
          alert(data.message || "Failed to remove course from cart");
        }

        submitButton.disabled = false;
        submitButton.textContent = originalText;
      } catch (error) {
        console.error("Error:", error);
        alert("An error occurred while removing from cart");
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  });

  // Initial load (optional if cart is already rendered server-side)
  refreshCartUI();
});
