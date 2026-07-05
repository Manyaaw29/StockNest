/**
 * StockNest Login Page
 * Handles password visibility toggle and form submission.
 * Integrated with backend API at http://localhost:5000/api/auth/login
 */
(function () {
  'use strict';
  const passwordInput = document.getElementById('password');
  const passwordToggle = document.getElementById('passwordToggle');
  const loginForm = document.getElementById('loginForm');
  if (!passwordInput || !passwordToggle || !loginForm) {
    return;
  }
  /**
   * Toggle password field visibility between masked and plain text.
   */
  function togglePasswordVisibility() {
    const isVisible = passwordInput.type === 'text';
    passwordInput.type = isVisible ? 'password' : 'text';
    passwordToggle.classList.toggle('is-visible', !isVisible);
    passwordToggle.setAttribute('aria-pressed', String(!isVisible));
    passwordToggle.setAttribute(
      'aria-label',
      isVisible ? 'Show password' : 'Hide password'
    );
  }
  passwordToggle.addEventListener('click', togglePasswordVisibility);
  
  /**
   * Handle login form submission.
   * Connects to StockNest auth API at POST /api/auth/login
   */
  loginForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    
    const emailOrPhone = document.getElementById('emailOrPhone').value.trim();
    const password = passwordInput.value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    if (!emailOrPhone || !password) {
      alert('Please enter email and password');
      return;
    }
    
    try {
      // Disable submit button to prevent multiple submissions
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Logging in...';
      
      // Call backend login API
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: emailOrPhone,
          password: password
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Login successful!
        console.log('Login successful:', data);
        
        // Store JWT token in localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Remember me functionality
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
          localStorage.setItem('email', emailOrPhone);
        }
        
        // Redirect to dashboard
        window.location.href = 'dashboard.html';
      } else {
        // Login failed - show error message
        alert('Login failed: ' + (data.message || 'Invalid email or password'));
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
      }
    } catch (error) {
      // Network error or backend not running
      console.error('Login error:', error);
      alert('Error: Could not reach server. Make sure backend is running on http://localhost:5000');
      
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Login';
    }
  });
})();