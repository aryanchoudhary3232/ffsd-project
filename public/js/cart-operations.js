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
        
        $.ajax({
          url: formAction,
          method: 'POST',
          data: form.serialize(),
          dataType: 'json',
          success: function(data) {
            if(data.success) {
              // Redirect to cart page after adding
              window.location.href = '/cart';
            }
          },
          error: function(xhr, status, error) {
            console.error('Error:', error);
          }
        });
      });
    }
    
    // Check if the form action contains '/cart/remove'
    if (formAction && formAction.includes('/cart/remove')) {
      form.on('submit', function(e) {
        e.preventDefault();
        
        $.ajax({
          url: formAction,
          method: 'POST',
          data: form.serialize(),
          dataType: 'json',
          success: function(data) {
            if(data.success) {
              // Redirect to cart page after removing
              window.location.href = '/cart';
            }
          },
          error: function(xhr, status, error) {
            console.error('Error:', error);
          }
        });
      });
    }
  });
});