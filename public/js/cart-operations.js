$(document).ready(function() {
  
  // Don't run cart operations on the learning page
  if (window.isLearningPage) {
    return;
  }

  // === Refresh Cart UI ===
  function refreshCartUI() {
    // Only run cart operations on cart pages - use specific cart container IDs
    const cartItemsContainer = $('#cart-items-list');
    if (cartItemsContainer.length === 0) return; // Exit if not on cart page
    
    $.ajax({
      url: '/cart',
      method: 'GET',
      dataType: 'json',
      success: function(data) {
        if (!data.success) return;

        cartItemsContainer.empty();

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
      }
    });
  }

  // === ADD TO CART ===
  $(document).on('submit', 'form[action*="/cart/add"]', function(e) {
    e.preventDefault();

    const form = $(this);
    const submitButton = form.find('button[type="submit"]');
    const originalText = submitButton.text();

    submitButton.prop('disabled', true).text('Adding...');

    $.ajax({
      url: form.attr('action'),
      method: 'POST',
      data: form.serialize(),
      dataType: 'json',
      success: function(data) {
        if (data.success) {
          alert('Course added to cart successfully!');
          refreshCartUI();
        } else {
          alert(data.message || 'Failed to add course to cart');
        }
        submitButton.prop('disabled', false).text(originalText);
      },
      error: function(xhr) {
        console.error('Error:', xhr.responseText);
        alert('An error occurred while adding to cart');
        submitButton.prop('disabled', false).text(originalText);
      }
    });
  });

  // === REMOVE FROM CART ===
  $(document).on('submit', '.remove-from-cart-form, form[action*="/cart/remove"]', function(e) {
    e.preventDefault();

    const form = $(this);
    const submitButton = form.find('button[type="submit"]');
    const originalText = submitButton.text();

    submitButton.prop('disabled', true).text('Removing...');

    $.ajax({
      url: form.attr('action'),
      method: 'POST',
      data: form.serialize(),
      dataType: 'json',
      success: function(data) {
        if (data.success) {
          refreshCartUI();
          if (window.updateCartCount) window.updateCartCount();
        } else {
          alert(data.message || 'Failed to remove course from cart');
        }
        submitButton.prop('disabled', false).text(originalText);
      },
      error: function(xhr) {
        console.error('Error:', xhr.responseText);
        alert('An error occurred while removing from cart');
        submitButton.prop('disabled', false).text(originalText);
      }
    });
  });

  // Initial load (optional if cart is already rendered server-side)
  refreshCartUI();
});
