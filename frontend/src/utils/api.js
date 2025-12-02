export const API_BASE = "https://vsgp-full-project-2.onrender.com";




export async function authFetch(path, options = {}) {
  const token = localStorage.getItem("vsgp_token");

  const headers = {
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let data = {};
    try {
      data = await res.json();
    } catch (e) {
      // ignore
    }
    throw new Error(data.msg || `API error: ${res.status}`);
  }

  return res;
}


