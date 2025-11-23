import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles.css";





export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    // مؤقت فقط – بعدين بنربطه بالباك اند
    if (email.trim() && password.trim()) {
      navigate("/groups");
    }
  };

  return (
    <div className="login-container">
      {/* Left Side */}
      <div className="login-left">
        <h1 className="login-title">
          Hello <span className="brand">Syno</span>! <span>👋</span>
        </h1>

        <p className="login-subtext">
          Organize your study groups with ease.  
          Track tasks, deadlines, members, and stay productive!
        </p>

        <p className="login-footer">© 2025 Syno. All rights reserved.</p>
      </div>

      {/* Right Side - Login Box */}
      <div className="login-right">
        <h2>Welcome Back!</h2>
        <p className="signup-text">
          Don’t have an account? <a href="#">Create a new account</a>
        </p>

        <form className="login-form" onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email address"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit" className="btn-login">
            Login Now
          </button>

          <button type="button" className="btn-google">
            Login with Google
          </button>

          <p className="forgot-text">
            Forget password? <a href="#">Click here</a>
          </p>
        </form>
      </div>
    </div>
  );
}
