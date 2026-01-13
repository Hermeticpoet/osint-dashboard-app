// auth.js - JWT token management
const TOKEN_KEY = 'osint_dashboard_token';
const USER_KEY = 'osint_dashboard_user';

/**
 * Store JWT token and user info in localStorage
 */
export function setToken(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

/**
 * Get JWT token from localStorage
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Get user info from localStorage
 */
export function getUser() {
  const userStr = localStorage.getItem(USER_KEY);
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Remove token and user info from localStorage
 */
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return !!getToken();
}

/**
 * Check if user has admin role
 */
export function isAdmin() {
  const user = getUser();
  return user && user.role === 'admin';
}

/**
 * Redirect to login if not authenticated
 */
export function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}
