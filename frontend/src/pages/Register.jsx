import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE } from "../utils/api";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.msg || "Failed to create account");
      }

      // ممكن نروح مباشرة للّوج إن
      navigate("/login");
    } catch (err) {
      setError(err.message || "Error registering.");
    } finally {
      setLoading(false);
    }
  };

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
          {/* اليسار (البنفسجي) */}
          <div className="auth-card-left">
            <div className="auth-hero">
              <h1>
                Hello <span className="highlight">Syno!</span> 👋
              </h1>
              <p>
                Organize your study groups with ease. Track tasks, deadlines,
                members, and stay productive!
              </p>
            </div>
            <div className="auth-footer">
              © 2025 Syno. All rights reserved.
            </div>
          </div>

          {/* اليمين (الفورم) */}
          <div className="auth-card-right">
            <h2>Create your account</h2>
            <p className="auth-subtext">
              Already have an account?{" "}
              <Link to="/login" className="link-like">
                Login instead
              </Link>
            </p>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
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

              <label className="auth-label">
                Email address
                <input
                  type="email"
                  className="auth-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
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
                  placeholder="Choose a strong password"
                  required
                />
              </label>

              <button
                type="submit"
                className="btn-primary-auth"
                disabled={loading}
              >
                {loading ? "Creating account..." : "Sign up"}
              </button>

              <button
                type="button"
                className="btn-secondary-auth"
                disabled
              >
                Login with Google (coming soon)
              </button>
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
