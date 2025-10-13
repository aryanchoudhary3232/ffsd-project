// Cart operations for non-admin pages// Minimal cart operations to prevent errors on admin pagesdocument.addEventListener("DOMContentLoaded", function () {document.addEventListener("DOMContentLoaded", function () {document.addEventListener("DOMContentLoaded", function () {

console.log("Cart operations loaded");

document.addEventListener("DOMContentLoaded", function () {

// Simple addToCart function

window.addToCart = function(courseId) {  // Skip cart operations on admin pages  // Don't run cart operations on learning pages or admin pages

  console.log("Add to cart:", courseId);

};  if (window.location.pathname.startsWith('/admin')) {



// Simple cart count update    console.log("Cart operations disabled on admin pages");  if (window.isLearningPage || window.location.pathname.startsWith('/admin')) {  // Don't run cart operations on learning pages or admin pages  // Don't run cart operations on learning pages or admin pages

function updateCartCount(count) {

  const elements = document.querySelectorAll('.cart-count');    return;

  elements.forEach(el => {

    if (el) {  }    return;

      el.textContent = count || 0;

      el.style.display = count > 0 ? 'inline' : 'none';

    }

  });  // Basic cart count update function  }  if (window.isLearningPage || window.location.pathname.startsWith('/admin')) {  if (window.isLearningPage || window.location.pathname.startsWith('/admin')) {

}
  function updateCartCount(count) {

    const cartElements = document.querySelectorAll(".cart-count");

    cartElements.forEach(function (element) {

      if (element) {  // === Update Cart Count ===    return;    return;

        element.textContent = count || 0;

        element.style.display = count > 0 ? "inline" : "none";  function updateCartCount(count) {

      }

    });    try {  }  }

  }

      const cartCountElements = document.querySelectorAll(".cart-count");

  // Add to cart function (global)

  window.addToCart = function (courseId) {      cartCountElements.forEach(function (element) {

    console.log("Add to cart:", courseId);

    // Implementation would go here        if (element && element.classList) {

  };

          element.textContent = count;  // === Refresh Cart UI ===  // === Refresh Cart UI ===

  // Only try to update cart count on non-admin pages

  try {          element.style.display = count > 0 ? "block" : "none";

    fetch("/cart/api/count")

      .then(response => response.json())        }  async function refreshCartUI() {  async function refreshCartUI() {

      .then(data => {

        if (data && data.success) {      });

          updateCartCount(data.count);

        }    } catch (error) {    // Only run cart operations on cart pages - use specific cart container IDs    // Only run cart operations on cart pages - use specific cart container IDs

      })

      .catch(() => {      // Silently handle cart count update errors

        // Silently fail

      });      console.log("Cart count update skipped (not on cart page)");    const cartItemsContainer = document.getElementById("cart-items-list");    const cartItemsContainer = document.getElementById("cart-items-list");

  } catch (error) {

    // Silently fail    }

  }

});  }    if (!cartItemsContainer) return;    if (!cartItemsContainer) return; // Exit if not on cart page



  // === Add to Cart (Global function) ===

  window.addToCart = function (courseId) {

    if (!courseId) return;    try {    try {



    fetch("/cart/add", {      const response = await fetch("/cart/api/items", {      const response = await fetch("/cart", {

      method: "POST",

      headers: {        method: "GET",        method: "GET",

        "Content-Type": "application/json",

      },        headers: {        headers: {

      body: JSON.stringify({ courseId }),

    })          Accept: "application/json",          Accept: "application/json",

      .then((response) => response.json())

      .then((data) => {          "Content-Type": "application/json",          "Content-Type": "application/json",

        if (data.success) {

          updateCartCount(data.cartCount);        },        },

        }

      })      });      });

      .catch((error) => {

        console.error("Error:", error);

      });

  };      if (!response.ok) {<<<<<<< HEAD



  // === Initialize Cart Count ===        throw new Error("Failed to fetch cart data");      if (!response.ok) {

  // Update cart count on all pages (safely)

  fetch("/cart/api/count")      }        throw new Error("Failed to fetch cart data");

    .then((response) => response.json())

    .then((data) => {=======

      if (data.success) {

        updateCartCount(data.count);      const data = await response.json();        if (data.cartItems.length > 0) {

      }

    })          data.cartItems.forEach(function(item) {

    .catch(() => {

      // Silently fail - this prevents errors on admin pages      if (!data.success) return;            cartItemsContainer.append(`

    });

});              <div class="p-4 flex flex-col md:flex-row gap-4">

      cartItemsContainer.innerHTML = "";                <div class="md:w-1/4">

                  <img src="${item.course.thumbnail}" alt="${item.course.title}" class="w-full h-32 object-cover rounded-md">

      if (data.cartItems.length > 0) {                </div>

        data.cartItems.forEach(function (item) {                <div class="md:w-2/4">

          const itemDiv = document.createElement("div");                  <h3 class="text-lg font-semibold mb-1">${item.course.title}</h3>

          itemDiv.className = "p-4 flex flex-col md:flex-row gap-4";                  <p class="text-gray-400 mb-2">By ${item.course.instructor}</p>

          itemDiv.innerHTML = `                  <div class="flex items-center mb-2">

            <div class="md:w-1/4">                    <span class="text-yellow-500 mr-1">★</span>

              <img src="${item.course.thumbnail || '/img/placeholder.svg'}" alt="${item.course.title}" class="w-full h-32 object-cover rounded-md">                    <span>${item.course.rating}</span>

            </div>                    <span class="text-gray-500 ml-1">(${item.course.students} students)</span>

            <div class="md:w-2/4">                  </div>

              <h3 class="text-lg font-semibold mb-1">${item.course.title}</h3>                  <p class="text-sm text-gray-500">Added on ${new Date(item.addedAt).toLocaleDateString()}</p>

              <p class="text-gray-400 mb-2">By ${item.course.instructor}</p>                </div>

              <div class="flex items-center mb-2">                <div class="md:w-1/4 flex flex-col justify-between items-end">

                <span class="text-yellow-500 mr-1">★</span>                  <div class="text-xl font-bold">₹${item.course.price.toFixed(2)}</div>

                <span>${item.course.rating}</span>                  <form action="/cart/remove" method="POST" class="mt-2 remove-from-cart-form">

                <span class="text-gray-500 ml-1">(${item.course.students} students)</span>                    <input type="hidden" name="courseId" value="${item.course._id}">

              </div>                    <button type="submit" class="text-red-400 hover:text-red-600">

              <p class="text-sm text-gray-500">Added on ${new Date(item.addedAt).toLocaleDateString()}</p>                      <i class="fas fa-trash-alt mr-1"></i> Remove

            </div>                    </button>

            <div class="md:w-1/4 flex flex-col justify-between items-end">                  </form>

              <div class="text-xl font-bold">₹${item.course.price.toFixed(2)}</div>                </div>

              <form action="/cart/remove" method="POST" class="mt-2 remove-from-cart-form">              </div>

                <input type="hidden" name="courseId" value="${item.course._id}">            `);

                <button type="submit" class="text-red-400 hover:text-red-600">          });

                  <i class="fas fa-trash-alt mr-1"></i> Remove        }

                </button>

              </form>        // Update totals

            </div>        $('#order-original-price').text(`₹${data.total.toFixed(2)}`);

          `;        $('#order-total-price').text(`₹${data.total.toFixed(2)}`);

          cartItemsContainer.appendChild(itemDiv);

        });        // Update cart count

        $('#cart-items-heading').text(`${data.cartItems.length} Course${data.cartItems.length !== 1 ? 's' : ''} in Cart`);

        // Update cart summary if elements exist>>>>>>> origin/main

        const originalPriceEl = document.getElementById("order-original-price");      }

        const totalPriceEl = document.getElementById("order-total-price");

        const cartHeadingEl = document.getElementById("cart-items-heading");      const data = await response.json();



        if (originalPriceEl) originalPriceEl.textContent = `₹${data.total.toFixed(2)}`;      if (!data.success) return;

        if (totalPriceEl) totalPriceEl.textContent = `₹${data.total.toFixed(2)}`;

        if (cartHeadingEl) {      cartItemsContainer.innerHTML = "";

          cartHeadingEl.textContent = `${data.cartItems.length} Course${data.cartItems.length !== 1 ? "s" : ""} in Cart`;

        }      if (data.cartItems.length > 0) {

      } else {        data.cartItems.forEach(function (item) {

        // Show empty cart message          const itemDiv = document.createElement("div");

        cartItemsContainer.innerHTML = `          itemDiv.className = "p-4 flex flex-col md:flex-row gap-4";

          <div class="text-center py-8">          itemDiv.innerHTML = `

            <i class="fas fa-shopping-cart text-4xl text-gray-400 mb-4"></i>            <div class="md:w-1/4">

            <h3 class="text-lg font-medium text-gray-300 mb-2">Your cart is empty</h3>              <img src="${item.course.thumbnail}" alt="${

            <p class="text-gray-500">Start adding courses to your cart</p>            item.course.title

          </div>          }" class="w-full h-32 object-cover rounded-md">

        `;            </div>

      }            <div class="md:w-2/4">

              <h3 class="text-lg font-semibold mb-1">${item.course.title}</h3>

      // Update cart count in header (safely)              <p class="text-gray-400 mb-2">By ${item.course.instructor}</p>

      updateCartCount(data.cartItems.length);              <div class="flex items-center mb-2">

    } catch (error) {                <span class="text-yellow-500 mr-1">★</span>

      console.error("Cart fetch failed:", error);                <span>${item.course.rating}</span>

    }                <span class="text-gray-500 ml-1">(${

  }                  item.course.students

                } students)</span>

  // === Update Cart Count ===              </div>

  function updateCartCount(count) {              <p class="text-sm text-gray-500">Added on ${new Date(

    try {                item.addedAt

      const cartCountElements = document.querySelectorAll(".cart-count");              ).toLocaleDateString()}</p>

      cartCountElements.forEach(function (element) {            </div>

        if (element && element.classList) {            <div class="md:w-1/4 flex flex-col justify-between items-end">

          element.textContent = count;              <div class="text-xl font-bold">$${item.course.price.toFixed(

          element.style.display = count > 0 ? "block" : "none";                2

        }              )}</div>

      });              <form action="/cart/remove" method="POST" class="mt-2 remove-from-cart-form">

    } catch (error) {                <input type="hidden" name="courseId" value="${item.course._id}">

      // Silently handle cart count update errors                <button type="submit" class="text-red-400 hover:text-red-600">

      console.log("Cart count update skipped (not on cart page)");                  <i class="fas fa-trash-alt mr-1"></i> Remove

    }                </button>

  }              </form>

            </div>

  // === Handle Remove from Cart ===          `;

  function handleRemoveFromCart(form) {          cartItemsContainer.appendChild(itemDiv);

    const formData = new FormData(form);        });

    const courseId = formData.get("courseId");      } else {

        const emptyDiv = document.createElement("div");

    fetch("/cart/remove", {        emptyDiv.className =

      method: "POST",          "bg-gray-800 rounded-lg shadow-md p-8 text-center w-full";

      headers: {        emptyDiv.innerHTML = `

        "Content-Type": "application/json",          <div class="text-gray-500 mb-4">

      },            <i class="fas fa-shopping-cart text-6xl"></i>

      body: JSON.stringify({ courseId }),          </div>

    })          <h2 class="text-xl font-bold mb-2">Your cart is empty</h2>

      .then((response) => response.json())          <p class="text-gray-500 mb-6">Looks like you haven't added any courses yet.</p>

      .then((data) => {          <a href="/courses" class="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition-colors">

        if (data.success) {            Browse Courses

          refreshCartUI();          </a>

          showCartMessage("Course removed from cart", "success");        `;

        } else {        cartItemsContainer.appendChild(emptyDiv);

          showCartMessage(data.message || "Error removing course", "error");      }

        }

      })      // Update totals

      .catch((error) => {      const originalPrice = document.getElementById("order-original-price");

        console.error("Error:", error);      const totalPrice = document.getElementById("order-total-price");

        showCartMessage("Error removing course from cart", "error");      const cartHeading = document.getElementById("cart-items-heading");

      });

  }      if (originalPrice)

        originalPrice.textContent = `$${data.total.toFixed(2)}`;

  // === Show Cart Messages ===      if (totalPrice) totalPrice.textContent = `$${data.total.toFixed(2)}`;

  function showCartMessage(message, type = "info") {      if (cartHeading) {

    const alertContainer = document.getElementById("cart-alerts");        cartHeading.textContent = `${data.cartItems.length} Course${

    if (!alertContainer) return;          data.cartItems.length !== 1 ? "s" : ""

        } in Cart`;

    const alertClass = type === "error" ? "bg-red-800 border-red-600 text-red-300" :       }

                      type === "success" ? "bg-green-800 border-green-600 text-green-300" :     } catch (error) {

                      "bg-blue-800 border-blue-600 text-blue-300";      console.error("Error refreshing cart:", error);

    }

    alertContainer.innerHTML = `  }

      <div class="${alertClass} border px-4 py-3 rounded mb-4">

        ${message}  // === ADD TO CART ===

      </div>  document.addEventListener("submit", async function (e) {

    `;    const form = e.target;



    // Auto-hide after 3 seconds    if (form.matches('form[action*="/cart/add"]')) {

    setTimeout(() => {      e.preventDefault();

      if (alertContainer) {

        alertContainer.innerHTML = "";      const submitButton = form.querySelector('button[type="submit"]');

      }      const originalText = submitButton.textContent;

    }, 3000);

  }      submitButton.disabled = true;

      submitButton.textContent = "Adding...";

  // === Add to Cart (Global function) ===

  window.addToCart = function (courseId) {      try {

    if (!courseId) {        const formData = new FormData(form);

      showCartMessage("Invalid course ID", "error");        const response = await fetch(form.action, {

      return;          method: "POST",

    }          headers: {

            Accept: "application/json",

    fetch("/cart/add", {            "Content-Type": "application/x-www-form-urlencoded",

      method: "POST",          },

      headers: {          body: new URLSearchParams(formData),

        "Content-Type": "application/json",        });

      },

      body: JSON.stringify({ courseId }),        const data = await response.json();

    })

      .then((response) => response.json())        if (data.success) {

      .then((data) => {          alert("Course added to cart successfully!");

        if (data.success) {          await refreshCartUI();

          refreshCartUI();        } else {

          updateCartCount(data.cartCount);          alert(data.message || "Failed to add course to cart");

          showCartMessage("Course added to cart!", "success");        }

        } else {

          showCartMessage(data.message || "Error adding course to cart", "error");        submitButton.disabled = false;

        }        submitButton.textContent = originalText;

      })      } catch (error) {

      .catch((error) => {        console.error("Error:", error);

        console.error("Error:", error);        alert("An error occurred while adding to cart");

        showCartMessage("Error adding course to cart", "error");        submitButton.disabled = false;

      });        submitButton.textContent = originalText;

  };      }

    }

  // === Event Listeners ===

  document.addEventListener("click", function (e) {    // === REMOVE FROM CART ===

    // Handle remove from cart form submission    if (

    if (e.target.closest(".remove-from-cart-form")) {      form.matches(".remove-from-cart-form") ||

      e.preventDefault();      form.matches('form[action*="/cart/remove"]')

      const form = e.target.closest(".remove-from-cart-form");    ) {

      handleRemoveFromCart(form);      e.preventDefault();

    }

  });      const submitButton = form.querySelector('button[type="submit"]');

      const originalText = submitButton.textContent;

  // === Initialize ===

  // Only refresh cart UI if we're on a cart page      submitButton.disabled = true;

  if (document.getElementById("cart-items-list")) {      submitButton.textContent = "Removing...";

    refreshCartUI();

  }      try {

        const formData = new FormData(form);

  // Update cart count on all pages (safely)        const response = await fetch(form.action, {

  fetch("/cart/api/count")          method: "POST",

    .then((response) => response.json())          headers: {

    .then((data) => {            Accept: "application/json",

      if (data.success) {            "Content-Type": "application/x-www-form-urlencoded",

        updateCartCount(data.count);          },

      }          body: new URLSearchParams(formData),

    })        });

    .catch(() => {

      // Silently fail - this prevents errors on admin pages        const data = await response.json();

    });

});        if (data.success) {
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
