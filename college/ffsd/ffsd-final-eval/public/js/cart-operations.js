document.addEventListener('DOMContentLoaded', function() {
  // Handle all forms that add to cart (regardless of class name)
  const allForms = document.querySelectorAll('form');
  
  allForms.forEach(form => {
    // Check if the form action contains '/cart/add'
    if (form.action && form.action.includes('/cart/add')) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        fetch(form.action, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams(new FormData(form))
        })
        .then(response => response.json())
        .then(data => {
          if(data.success) {
            // Redirect to cart page after adding
            window.location.href = '/cart';
          }
        })
        .catch(error => {
          console.error('Error:', error);
        });
      });
    }
    
    // Check if the form action contains '/cart/remove'
    if (form.action && form.action.includes('/cart/remove')) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        fetch(form.action, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams(new FormData(form))
        })
        .then(response => response.json())
        .then(data => {
          if(data.success) {
            // Redirect to cart page after removing
            window.location.href = '/cart';
          }
        })
        .catch(error => {
          console.error('Error:', error);
        });
      });
    }
  });
});
