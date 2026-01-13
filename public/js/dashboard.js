// dashboard.js - Dashboard page logic
import { requireAuth, getUser, clearAuth, isAdmin } from './auth.js';
import { apiGet } from './api.js';

// Require authentication
if (!requireAuth()) {
  // Redirect handled by requireAuth
  // Exit early - redirect will happen
}

const userInfo = document.getElementById('userInfo');
const logoutBtn = document.getElementById('logoutBtn');
const statsContainer = document.getElementById('statsContainer');

// Display user info
const user = getUser();
if (user) {
  const roleBadge = user.role === 'admin' ? '<span class="badge badge-success">Admin</span>' : '<span class="badge badge-secondary">Read-only</span>';
  userInfo.innerHTML = `Logged in as <strong>${user.username}</strong> ${roleBadge}`;
}

// Logout handler
logoutBtn.addEventListener('click', () => {
  clearAuth();
  window.location.href = '/login.html';
});

// Load statistics
async function loadStats() {
  try {
    const results = await apiGet('/results', { limit: 1000 });
    
    const totalScans = results.length;
    const validSsl = results.filter(r => r.ssl_valid === 1).length;
    const invalidSsl = results.filter(r => r.ssl_valid === 0).length;
    const uniqueDomains = new Set(results.map(r => r.domain)).size;
    
    statsContainer.innerHTML = `
      <div class="stat-item">
        <div class="stat-value">${totalScans}</div>
        <div class="stat-label">Total Scans</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${uniqueDomains}</div>
        <div class="stat-label">Unique Domains</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${validSsl}</div>
        <div class="stat-label">Valid SSL</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${invalidSsl}</div>
        <div class="stat-label">Invalid SSL</div>
      </div>
    `;
  } catch (error) {
    statsContainer.innerHTML = `<p class="error-message">Failed to load statistics: ${error.message}</p>`;
  }
}

// Load stats on page load
loadStats();
