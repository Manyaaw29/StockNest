/**
 * StockNest - Shared Utilities
 * Import this module in all pages to ensure consistent auth handling.
 */

// ─── API Base URL ───────────────────────────────────────────────────────────
export const API_BASE_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://stocknest-rpcw.onrender.com';

// ─── Token / User Helpers ───────────────────────────────────────────────────
/** Returns the JWT token - checks all known keys for backward compatibility */
export function getToken() {
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('stocknest_token') ||
    sessionStorage.getItem('token') ||
    sessionStorage.getItem('stocknest_token') ||
    null
  );
}

/** Returns the logged-in user object */
export function getUser() {
  const raw =
    localStorage.getItem('user') ||
    localStorage.getItem('stocknest_user') ||
    sessionStorage.getItem('user') ||
    sessionStorage.getItem('stocknest_user');
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Saves token and user to localStorage under canonical keys */
export function saveAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  // Remove old keys if they exist
  localStorage.removeItem('stocknest_token');
  localStorage.removeItem('stocknest_user');
}

/** Clears all auth data and redirects to login */
export function logout() {
  ['token', 'user', 'stocknest_token', 'stocknest_user'].forEach(k => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });
  window.location.href = 'index.html';
}

// ─── Auth Guard ─────────────────────────────────────────────────────────────
/**
 * Call at the top of any protected page.
 * Redirects to index.html if no token is found.
 */
export function requireAuth() {
  if (!getToken()) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

// ─── Authenticated fetch wrapper ────────────────────────────────────────────
/**
 * fetch() wrapper that automatically attaches the Bearer token.
 * Throws on non-OK responses.
 */
export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Token expired or invalid — force re-login
    logout();
    throw new Error('Session expired. Please log in again.');
  }

  return res;
}
