// results.js - Results page logic
import { requireAuth, getUser, clearAuth, isAdmin } from './auth.js';
import { apiGet, apiDelete, downloadCsv } from './api.js';

// Require authentication
if (!requireAuth()) {
  // Redirect handled by requireAuth
  // Exit early - redirect will happen
}

const userInfo = document.getElementById('userInfo');
const logoutBtn = document.getElementById('logoutBtn');
const resultsTableBody = document.getElementById('resultsTableBody');
const loadingMessage = document.getElementById('loadingMessage');
const errorMessage = document.getElementById('errorMessage');
const noResults = document.getElementById('noResults');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const refreshBtn = document.getElementById('refreshBtn');
const applyFiltersBtn = document.getElementById('applyFilters');
const clearFiltersBtn = document.getElementById('clearFilters');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');

// Display user info
const user = getUser();
if (user) {
  const roleBadge = user.role === 'admin' ? '<span class="badge badge-success">Admin</span>' : '<span class="badge badge-secondary">Read-only</span>';
  userInfo.innerHTML = `Logged in as <strong>${user.username}</strong> ${roleBadge}`;
}

// Show/hide admin-only features
if (isAdmin()) {
  exportCsvBtn.style.display = 'inline-block';
} else {
  exportCsvBtn.style.display = 'none';
}

// Logout handler
logoutBtn.addEventListener('click', () => {
  clearAuth();
  window.location.href = '/login.html';
});

// Pagination state
let currentPage = 1;
const pageSize = 50;
let currentFilters = {};

// Load results
async function loadResults(page = 1) {
  loadingMessage.style.display = 'block';
  errorMessage.style.display = 'none';
  noResults.style.display = 'none';
  resultsTableBody.innerHTML = '';
  
  try {
    const params = {
      ...currentFilters,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    };
    
    const results = await apiGet('/results', params);
    
    loadingMessage.style.display = 'none';
    
    if (results.length === 0) {
      noResults.style.display = 'block';
      resultsTableBody.innerHTML = '';
    } else {
      displayResults(results);
      updatePagination(page, results.length);
    }
  } catch (error) {
    loadingMessage.style.display = 'none';
    errorMessage.textContent = `Failed to load results: ${error.message}`;
    errorMessage.style.display = 'block';
  }
}

// Display results in table
function displayResults(results) {
  resultsTableBody.innerHTML = results.map(result => {
    const sslBadge = result.ssl_valid === 1 
      ? '<span class="badge badge-success">Valid</span>'
      : '<span class="badge badge-danger">Invalid</span>';
    
    const sslExpires = result.ssl_valid_to || 'N/A';
    const registrar = result.registrar || 'N/A';
    const whoisExpires = result.whois_expirationDate || 'N/A';
    
    const deleteBtn = isAdmin() 
      ? `<button class="btn btn-danger" onclick="deleteResult(${result.id})">Delete</button>`
      : '<span class="badge badge-secondary">Read-only</span>';
    
    return `
      <tr>
        <td>${result.id}</td>
        <td><strong>${escapeHtml(result.domain)}</strong></td>
        <td>${escapeHtml(result.ip)}</td>
        <td>${sslBadge}</td>
        <td>${escapeHtml(sslExpires)}</td>
        <td>${escapeHtml(registrar)}</td>
        <td>${escapeHtml(whoisExpires)}</td>
        <td>${formatDate(result.created_at)}</td>
        <td>${deleteBtn}</td>
      </tr>
    `;
  }).join('');
}

// Update pagination controls
function updatePagination(page, resultCount) {
  currentPage = page;
  pageInfo.textContent = `Page ${page}`;
  
  prevPageBtn.disabled = page === 1;
  nextPageBtn.disabled = resultCount < pageSize;
}

// Delete result (admin only)
window.deleteResult = async function(id) {
  if (!isAdmin()) {
    alert('You do not have permission to delete results.');
    return;
  }
  
  if (!confirm(`Are you sure you want to delete result #${id}?`)) {
    return;
  }
  
  try {
    await apiDelete(`/results/${id}`);
    // Reload results
    loadResults(currentPage);
  } catch (error) {
    alert(`Failed to delete result: ${error.message}`);
  }
};

// Export CSV
exportCsvBtn.addEventListener('click', async () => {
  if (!isAdmin()) {
    alert('You do not have permission to export results.');
    return;
  }
  
  try {
    exportCsvBtn.disabled = true;
    exportCsvBtn.textContent = 'Exporting...';
    
    await downloadCsv('/results/export.csv', currentFilters, `osint-results-${new Date().toISOString().split('T')[0]}.csv`);
    
    exportCsvBtn.disabled = false;
    exportCsvBtn.textContent = 'Export CSV';
  } catch (error) {
    alert(`Failed to export CSV: ${error.message}`);
    exportCsvBtn.disabled = false;
    exportCsvBtn.textContent = 'Export CSV';
  }
});

// Refresh results
refreshBtn.addEventListener('click', () => {
  loadResults(currentPage);
});

// Apply filters
applyFiltersBtn.addEventListener('click', () => {
  currentFilters = {};
  
  const domain = document.getElementById('filterDomain').value.trim();
  if (domain) {
    currentFilters.domain = domain;
  }
  
  const ssl = document.getElementById('filterSsl').value;
  if (ssl) {
    currentFilters.ssl_valid = ssl;
  }
  
  const registrar = document.getElementById('filterRegistrar').value.trim();
  if (registrar) {
    currentFilters.registrar = registrar;
  }
  
  currentPage = 1;
  loadResults(1);
});

// Clear filters
clearFiltersBtn.addEventListener('click', () => {
  document.getElementById('filterDomain').value = '';
  document.getElementById('filterSsl').value = '';
  document.getElementById('filterRegistrar').value = '';
  currentFilters = {};
  currentPage = 1;
  loadResults(1);
});

// Pagination
prevPageBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    loadResults(currentPage - 1);
  }
});

nextPageBtn.addEventListener('click', () => {
  loadResults(currentPage + 1);
});

// Helper functions
function escapeHtml(text) {
  if (text === null || text === undefined) return 'N/A';
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

// Load results on page load
loadResults(1);
