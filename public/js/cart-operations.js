$(document).ready(function() {
  // Handle all forms that add to cart (regardless of class name)
  const allForms = $('form');
  
  allForms.each(function() {
    const form = $(this);
    const formAction = form.attr('action');
    
    // Check if the form action contains '/cart/add'
    if (formAction && formAction.includes('/cart/add')) {
      form.on('submit', function(e) {
        e.preventDefault();
        
        // Show loading state
        const submitButton = form.find('button[type="submit"]');
        const originalText = submitButton.text();
        submitButton.prop('disabled', true).text('Adding...');
        
        $.ajax({
          url: formAction,
          method: 'POST',
          data: form.serialize(),
          dataType: 'json',
          success: function(data) {
            if(data.success) {
              // Show success message and redirect to cart page
              alert('Course added to cart successfully!');
              window.location.href = '/cart';
            } else {
              alert(data.message || 'Failed to add course to cart');
              submitButton.prop('disabled', false).text(originalText);
            }
          },
          error: function(xhr, status, error) {
            console.error('Error:', error);
            let errorMessage = 'An error occurred while adding to cart';
            
            if (xhr.responseJSON && xhr.responseJSON.message) {
              errorMessage = xhr.responseJSON.message;
            }
            
            alert(errorMessage);
            submitButton.prop('disabled', false).text(originalText);
          }
        });
      });
    }
    
    // Check if the form action contains '/cart/remove'
    if (formAction && formAction.includes('/cart/remove')) {
      form.on('submit', function(e) {
        e.preventDefault();
        
        // Show loading state
        const submitButton = form.find('button[type="submit"]');
        const originalText = submitButton.text();
        submitButton.prop('disabled', true).text('Removing...');
        
        $.ajax({
          url: formAction,
          method: 'POST',
          data: form.serialize(),
          dataType: 'json',
          success: function(data) {
            if(data.success) {
              // Redirect to cart page after removing
              window.location.href = '/cart';
            } else {
              alert(data.message || 'Failed to remove course from cart');
              submitButton.prop('disabled', false).text(originalText);
            }
          },
          error: function(xhr, status, error) {
            console.error('Error:', error);
            let errorMessage = 'An error occurred while removing from cart';
            
            if (xhr.responseJSON && xhr.responseJSON.message) {
              errorMessage = xhr.responseJSON.message;
            }
            
            alert(errorMessage);
            submitButton.prop('disabled', false).text(originalText);
          }
        });
      });
    }
  });
});