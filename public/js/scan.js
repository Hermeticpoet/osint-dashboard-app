// scan.js - Scan page logic
import { requireAuth, getUser, clearAuth } from './auth.js';
import { apiPost } from './api.js';

// Require authentication
if (!requireAuth()) {
  // Redirect handled by requireAuth
  // Exit early - redirect will happen
}

const userInfo = document.getElementById('userInfo');
const logoutBtn = document.getElementById('logoutBtn');
const scanForm = document.getElementById('scanForm');
const errorMessage = document.getElementById('errorMessage');
const scanResult = document.getElementById('scanResult');
const resultContent = document.getElementById('resultContent');
const scanBtn = document.getElementById('scanBtn');

// Display user info
const user = getUser();
if (user) {
  const roleBadge = user.role === 'admin' ? '<span class="badge badge-success">Admin</span>' : '<span class="badge badge-secondary">Read-only</span>';
  userInfo.innerHTML = `Logged in as <strong>${user.username}</strong> ${roleBadge}`;
}

// Check if user is admin (scan requires admin role)
if (user && user.role !== 'admin') {
  scanForm.innerHTML = '<div class="error-message">You do not have permission to perform scans. Admin access required.</div>';
  scanForm.querySelector('button')?.setAttribute('disabled', 'true');
}

// Logout handler
logoutBtn.addEventListener('click', () => {
  clearAuth();
  window.location.href = '/login.html';
});

// Scan form handler
scanForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const domain = document.getElementById('domain').value.trim();
  
  // Clear previous errors and results
  errorMessage.style.display = 'none';
  errorMessage.textContent = '';
  scanResult.style.display = 'none';
  
  // Disable form during submission
  scanBtn.disabled = true;
  scanBtn.textContent = 'Scanning...';
  
  try {
    const response = await apiPost('/scan', { domain });
    
    if (response.id && response.result) {
      // Display success result
      displayScanResult(response);
    } else if (response.id === null && response.result === 'INVALID_DOMAIN') {
      throw new Error('Invalid domain. Please check the domain name and try again.');
    } else if (response.id === null && response.result === 'SCAN_FAILED') {
      throw new Error('Scan failed. All lookups (WHOIS, SSL, IP) failed. Please try again later.');
    } else {
      throw new Error('Unexpected response from server');
    }
  } catch (error) {
    // Show error message
    errorMessage.textContent = error.message || 'Scan failed. Please try again.';
    errorMessage.style.display = 'block';
  } finally {
    // Re-enable form
    scanBtn.disabled = false;
    scanBtn.textContent = 'Scan Domain';
  }
});

function displayScanResult(data) {
  const { id, result } = data;
  
  let html = `
    <div class="result-section">
      <h4>Scan Information</h4>
      <div class="result-data">
        <div class="result-item">
          <span class="result-label">Result ID:</span>
          <span class="result-value">${id}</span>
        </div>
        <div class="result-item">
          <span class="result-label">Domain:</span>
          <span class="result-value">${escapeHtml(result.domain)}</span>
        </div>
        <div class="result-item">
          <span class="result-label">Timestamp:</span>
          <span class="result-value">${formatDate(result.timestamp)}</span>
        </div>
      </div>
    </div>
  `;
  
  if (result.ip) {
    html += `
      <div class="result-section">
        <h4>IP Address</h4>
        <div class="result-data">
          <div class="result-item">
            <span class="result-label">IP:</span>
            <span class="result-value">${escapeHtml(result.ip)}</span>
          </div>
        </div>
      </div>
    `;
  }
  
  if (result.ssl) {
    const ssl = result.ssl;
    html += `
      <div class="result-section">
        <h4>SSL Certificate</h4>
        <div class="result-data">
          <div class="result-item">
            <span class="result-label">Valid:</span>
            <span class="result-value">${ssl.valid !== null ? (ssl.valid ? '<span class="badge badge-success">Yes</span>' : '<span class="badge badge-danger">No</span>') : '<span class="badge badge-secondary">N/A</span>'}</span>
          </div>
          ${ssl.validFrom ? `<div class="result-item"><span class="result-label">Valid From:</span><span class="result-value">${escapeHtml(ssl.validFrom)}</span></div>` : ''}
          ${ssl.validTo ? `<div class="result-item"><span class="result-label">Valid To:</span><span class="result-value">${escapeHtml(ssl.validTo)}</span></div>` : ''}
          ${ssl.daysRemaining !== null ? `<div class="result-item"><span class="result-label">Days Remaining:</span><span class="result-value">${ssl.daysRemaining}</span></div>` : ''}
        </div>
      </div>
    `;
  }
  
  if (result.whois) {
    const whois = result.whois;
    html += `
      <div class="result-section">
        <h4>WHOIS Information</h4>
        <div class="result-data">
          ${whois.registrarName ? `<div class="result-item"><span class="result-label">Registrar:</span><span class="result-value">${escapeHtml(whois.registrarName)}</span></div>` : '<div class="result-item"><span class="result-label">Registrar:</span><span class="result-value">N/A</span></div>'}
          ${whois.creationDate ? `<div class="result-item"><span class="result-label">Creation Date:</span><span class="result-value">${formatDate(whois.creationDate)}</span></div>` : '<div class="result-item"><span class="result-label">Creation Date:</span><span class="result-value">N/A</span></div>'}
          ${whois.expirationDate ? `<div class="result-item"><span class="result-label">Expiration Date:</span><span class="result-value">${formatDate(whois.expirationDate)}</span></div>` : '<div class="result-item"><span class="result-label">Expiration Date:</span><span class="result-value">N/A</span></div>'}
        </div>
      </div>
    `;
  }
  
  resultContent.innerHTML = html;
  scanResult.style.display = 'block';
  
  // Scroll to result
  scanResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch (e) {
    return dateString;
  }
}
