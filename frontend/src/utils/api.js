export const API_BASE =
  import.meta.env.VITE_API_BASE || "http://localhost:5000";

export async function authFetch(path, options = {}) {
  const token = localStorage.getItem("vsgp_token");

  const headers = { ...(options.headers || {}) };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) headers["Authorization"] = `Bearer ${token}`;

  return fetch(`${API_BASE}${path}`, { ...options, headers });
}
