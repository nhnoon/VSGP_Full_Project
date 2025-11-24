import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../utils/api";

export default function Login() {
  const [mode, setMode] = useState("login"); // "login" أو "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("noon@test.com");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      const endpoint =
        mode === "login" ? "/auth/login" : "/auth/register";

      const body =
        mode === "login"
          ? { email, password }
          : { name: name || email.split("@")[0], email, password };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.msg || "Something went wrong");
      }

      if (mode === "login") {
        // نتأكد إن نفس المفتاح اللي باقي الصفحات تستخدمه
        localStorage.setItem("vsgp_token", data.access_token);
        navigate("/groups");
      } else {
        // وضع التسجيل: بس نرجعه لوضع الدخول برسالة نجاح
        setMode("login");
        setInfo("Account created successfully. You can login now ✨");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setError("");
    setInfo("");
    setMode((prev) => (prev === "login" ? "register" : "login"));
  };

  const isLogin = mode === "login";

  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="top-nav-left">
          <div className="logo-circle">
            <span className="logo-icon">S</span>
          </div>
          <div className="logo-text">
            <span className="logo-title">Syno</span>
            <span className="logo-subtitle">Study Platform</span>
          </div>
        </div>
      </header>

      <main className="page-main auth-main">
        <div className="auth-page">
          {/* LEFT SIDE */}
          <div className="auth-card-left">
            <div className="auth-hero">
              <h1>
                Hello <span className="highlight">Syno!</span> 👋
              </h1>
              <p>
                Organize your study groups with ease. Track tasks,
                deadlines, members, and stay productive!
              </p>
            </div>
            <div className="auth-footer">
              © 2025 Syno. All rights reserved.
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="auth-card-right">
            <h2>{isLogin ? "Welcome Back!" : "Create your account"}</h2>
            <p className="auth-subtext">
              {isLogin ? (
                <>
                  Don&apos;t have an account?{" "}
                  <span className="link-like" onClick={toggleMode}>
                    Create a new account
                  </span>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <span className="link-like" onClick={toggleMode}>
                    Login instead
                  </span>
                </>
              )}
            </p>

            {error && <div className="auth-error">{error}</div>}
            {info && (
              <div className="auth-error" style={{ background: "#dcfce7", color: "#166534" }}>
                {info}
              </div>
            )}

            <form className="auth-form" onSubmit={handleSubmit}>
              {!isLogin && (
                <label className="auth-label">
                  Name (optional)
                  <input
                    type="text"
                    className="auth-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </label>
              )}

              <label className="auth-label">
                Email address
                <input
                  type="email"
                  className="auth-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>

              <label className="auth-label">
                Password
                <input
                  type="password"
                  className="auth-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>

              <button
                type="submit"
                className="btn-primary-auth"
                disabled={loading}
              >
                {loading
                  ? isLogin
                    ? "Logging in..."
                    : "Creating account..."
                  : isLogin
                  ? "Login Now"
                  : "Sign up"}
              </button>

              {isLogin && (
                <button
                  type="button"
                  className="btn-secondary-auth"
                  disabled
                >
                  Login with Google (coming soon)
                </button>
              )}
            </form>

            <p className="auth-forgot">
              By continuing you agree that this is for your study groups only ✨
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
