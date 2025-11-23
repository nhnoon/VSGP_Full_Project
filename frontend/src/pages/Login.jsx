import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../utils/api";

export default function Login() {
  const [email, setEmail] = useState("noon@test.com");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await authFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.msg || "Login failed. Please check your email or password.");
        return;
      }

      const token =
        data.token ||
        data.access_token ||
        data.jwt ||
        data.accessToken;

      if (!token) {
        setError("Token not received from server.");
        return;
      }

      localStorage.setItem("vsgp_token", token);
      navigate("/groups");
    } catch (err) {
      console.error(err);
      setError("Login failed. Please try again.");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card-left">
        <div className="auth-hero">
          <h1>
            Hello <span className="highlight">Syno!</span> 👋
          </h1>
          <p>
            Organize your study groups with ease. Track tasks, deadlines, members,
            and stay productive!
          </p>
        </div>
        <footer className="auth-footer">© 2025 Syno. All rights reserved.</footer>
      </div>

      <div className="auth-card-right">
        <h2>Welcome Back!</h2>
        <p className="auth-subtext">
          Don&apos;t have an account?{" "}
          <span className="link-like">Create a new account</span>
        </p>

        <form className="auth-form" onSubmit={handleLogin}>
          <label className="auth-label">
            Email address
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              required
            />
          </label>

          <label className="auth-label">
            Password
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="btn-primary-auth">
            Login Now
          </button>

          <button
            type="button"
            className="btn-secondary-auth"
            onClick={() => alert("Google login coming soon 🙂")}
          >
            Login with Google
          </button>

          <p className="auth-forgot">
            Forget password? <span className="link-like">Click here</span>
          </p>
        </form>
      </div>
    </div>
  );
}
