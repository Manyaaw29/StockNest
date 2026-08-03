// Auto-clear any stale tokens from old key names on login page load
['stocknest_token', 'stocknest_user'].forEach(k => { localStorage.removeItem(k); sessionStorage.removeItem(k); });

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginAlert = document.getElementById('loginAlert');
    const passwordToggle = document.getElementById('passwordToggle');
    const passwordInput = document.getElementById('password');

    // Toggle password visibility
    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', (e) => {
            e.preventDefault();
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            const iconEye = passwordToggle.querySelector('.icon-eye');
            const iconEyeOff = passwordToggle.querySelector('.icon-eye-off');
            if (type === 'text') {
                passwordToggle.setAttribute('aria-pressed', 'true');
                if (iconEye) iconEye.style.display = 'none';
                if (iconEyeOff) iconEyeOff.style.display = 'block';
            } else {
                passwordToggle.setAttribute('aria-pressed', 'false');
                if (iconEye) iconEye.style.display = 'block';
                if (iconEyeOff) iconEyeOff.style.display = 'none';
            }
        });
        const iconEyeOff = passwordToggle.querySelector('.icon-eye-off');
        if (iconEyeOff) iconEyeOff.style.display = 'none';
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('emailOrPhone').value.trim();
            const password = document.getElementById('password').value;
            if (!email || !password) { showAlert('Please enter both email and password.', 'error'); return; }
            loginAlert.style.display = 'none';
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Logging in...';
            try {
                const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                    ? 'http://localhost:5000/api/auth/login'
                    : '/api/auth/login';
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Login failed.');
                showAlert('Login successful! Redirecting...', 'success');

                // Save under canonical keys — ALSO clear any old keys
                ['stocknest_token', 'stocknest_user'].forEach(k => localStorage.removeItem(k));
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                setTimeout(() => { window.location.href = 'dashboard.html'; }, 900);
            } catch (err) {
                showAlert(err.message, 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    function showAlert(message, type = 'error') {
        if (!loginAlert) return;
        loginAlert.textContent = message;
        loginAlert.style.cssText = `display:block;padding:10px;margin-bottom:16px;border-radius:6px;font-size:14px;font-weight:500;${
            type === 'success'
                ? 'background:#dcfce7;color:#15803d;border:1px solid #4ade80;'
                : 'background:#fee2e2;color:#b91c1c;border:1px solid #f87171;'
        }`;
    }
});
