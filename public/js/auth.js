// Signup form handler
document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    
    try {
        const response = await fetch('/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error signing up');
        }
        
        alert('Signup successful! Redirecting to homepage...');
        window.location.href = '/dashboard'; // Redirect to dashboard or home page
        
    } catch (error) {
        console.error('Signup error:', error);
        alert(error.message);
    }
});

// Signin form handler
document.getElementById('signinForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;
    
    try {
        const response = await fetch('/auth/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error signing in');
        }
        
        alert('Login successful! Redirecting to homepage...');
        window.location.href = '/dashboard'; // Redirect to dashboard or home page
        
    } catch (error) {
        console.error('Login error:', error);
        alert(error.message);
    }
});

// Logout handler
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
        const response = await fetch('/auth/logout', {
            method: 'GET'
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Error logging out');
        }
        
        window.location.href = '/'; // Redirect to home page
        
    } catch (error) {
        console.error('Logout error:', error);
        alert(error.message);
    }
});
