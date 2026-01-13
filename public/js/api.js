// api.js - API wrapper functions
import { getToken, clearAuth } from './auth.js';

const API_BASE_URL = window.location.origin;

/**
 * Get authorization headers
 */
function getAuthHeaders() {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

/**
 * Handle API errors
 */
async function handleError(response) {
  if (response.status === 401 || response.status === 403) {
    // Unauthorized or Forbidden - clear auth and redirect to login
    clearAuth();
    window.location.href = '/login.html';
    throw new Error('Authentication required');
  }
  
  let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
  try {
    const errorData = await response.json();
    if (errorData.error) {
      errorMessage = errorData.error;
    } else if (errorData.result) {
      errorMessage = errorData.result;
    }
  } catch (e) {
    // If response is not JSON, use status text
  }
  
  throw new Error(errorMessage);
}

/**
 * GET request
 */
export async function apiGet(endpoint, params = {}) {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  
  // Add query parameters
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
      url.searchParams.append(key, params[key]);
    }
  });
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    await handleError(response);
  }
  
  return response.json();
}

/**
 * POST request
 */
export async function apiPost(endpoint, data = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    await handleError(response);
  }
  
  return response.json();
}

/**
 * DELETE request
 */
export async function apiDelete(endpoint) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    await handleError(response);
  }
  
  return response.json();
}

/**
 * Download CSV file
 */
export async function downloadCsv(endpoint, params = {}, filename = 'results.csv') {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }
  
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  
  // Add query parameters
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
      url.searchParams.append(key, params[key]);
    }
  });
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    await handleError(response);
  }
  
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(downloadUrl);
}
