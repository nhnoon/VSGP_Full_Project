// frontend/src/utils/api.js

// رابط الباك إند في Render
export const API_BASE = "https://vsgp-full-project-2.onrender.com";

// دالة مشابهة لـ fetch لكنها تضيف التوكن في الـ headers
export async function authFetch(path, options = {}) {
 const token = localStorage.getItem("vsgp_token");

  // ندمج الهيدرز اللي تجي من الاستدعاء مع حقنا
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // نرجّع Response زي fetch تماماً
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

 return res;
}

// لو في أماكن تستخدمه كـ default import
//export default authFetch;
// frontend/src/utils/api.js

