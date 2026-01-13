// login.js - Login page logic
import { apiPost } from './api.js';
import { isAuthenticated, setToken } from './auth.js';

// Redirect if already logged in
if (isAuthenticated()) {
  window.location.href = '/dashboard.html';
}

const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');

loginForm.addEventListener('submit', async e => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  // Clear previous errors
  errorMessage.style.display = 'none';
  errorMessage.textContent = '';

  // Disable form during submission
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging in...';

  try {
    // Call login endpoint
    const response = await apiPost('/login', { username, password });

    if (response.token) {
      // Store token and user info
      setToken(response.token, {
        username,
        role: username === 'admin' ? 'admin' : 'read-only',
      });

      // Redirect to dashboard
      window.location.href = '/dashboard.html';
    } else {
      throw new Error('Invalid response from server');
    }
  } catch (error) {
    // Show error message
    errorMessage.textContent =
      error.message || 'Login failed. Please check your credentials.';
    errorMessage.style.display = 'block';

    // Re-enable form
    submitBtn.disabled = false;
    submitBtn.textContent = 'Login';
  }
});
