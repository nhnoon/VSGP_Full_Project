const API_BASE = "http://127.0.0.1:5000";

export function authFetch(path, options = {}) {
  const token = localStorage.getItem("vsgp_token");
  const body = options.body;

  const isFormData = body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
}
