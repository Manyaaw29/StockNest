/**
 * StockNest Login Page
 * Handles password visibility toggle and form submission.
 */

(function () {
  'use strict';


  const passwordInput   = document.getElementById('password');
  const passwordToggle  = document.getElementById('passwordToggle');
  const loginForm       = document.getElementById('loginForm');
  const API_BASE_URL = 'https://stocknest-rpcw.onrender.com';

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

  const loginAlert = document.getElementById('loginAlert');
  const submitButton = loginForm.querySelector('button[type="submit"]');
  const originalButtonText = submitButton.innerHTML;

  function showAlert(message, type = 'error') {
    loginAlert.textContent = message;
    loginAlert.className = `form-alert form-alert--${type}`;
    loginAlert.style.display = 'block';
  }

  function hideAlert() {
    loginAlert.style.display = 'none';
    loginAlert.textContent = '';
  }

  /**
   * Handle login form submission.
   */
  loginForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    hideAlert();

    const email = document.getElementById('emailOrPhone').value.trim();
    const password = passwordInput.value;
    const rememberMe = document.getElementById('rememberMe').checked;

    if (!email || !password) {
      showAlert('Please enter both email and password.');
      return;
    }

    try {
      // Disable button and show loading state
      submitButton.disabled = true;
      submitButton.innerHTML = 'Logging in... <span class="btn-arrow" aria-hidden="true">→</span>';

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      let data = {};
      try {
        data = await response.json();
      } catch (parseError) {
        data = {};
      }

      if (!response.ok) {
        throw new Error(data.message || 'Login failed. Please try again.');
      }

      // Success
      showAlert('Login successful! Redirecting...', 'success');
      
      // Save token in localStorage or sessionStorage
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('token', data.token);
      storage.setItem('user', JSON.stringify(data.user));

      console.log('Logged in user:', data.user);
      
      // Redirect to the dashboard
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
    } catch (err) {
      showAlert(err.message);
    } finally {
      // Re-enable button
      submitButton.disabled = false;
      submitButton.innerHTML = originalButtonText;
    }
  });

})();
