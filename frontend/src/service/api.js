const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

/**
 * Generic API request wrapper that attaches JWT Bearer header if token exists.
 */
export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("auth_token");
  
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = data.detail || data.message || "An unexpected error occurred.";
    throw new Error(errorMessage);
  }

  return data;
}

/**
 * Register a new user (student or professor).
 */
export async function registerUser({ name, email, password, role }) {
  return apiRequest("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password, role }),
  });
}

/**
 * Log in a user and retrieve JWT token + user details.
 */
export async function loginUser({ email, password }) {
  return apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

/**
 * Get active authenticated user details.
 */
export async function getCurrentUser() {
  return apiRequest("/api/auth/me", {
    method: "GET",
  });
}
