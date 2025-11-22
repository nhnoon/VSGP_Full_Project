import { useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:5000";

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login"); // login | register
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    try {
      if (mode === "register") {
        const res = await axios.post(`${API_BASE}/auth/register`, {
          name,
          email,
          password
        });
        const token = res.data.access;
        localStorage.setItem("token", token);
        onLogin(token);
        setMsg("Registered & logged in successfully");
      } else {
        const res = await axios.post(`${API_BASE}/auth/login`, {
          email,
          password
        });
        const token = res.data.access;
        localStorage.setItem("token", token);
        onLogin(token);
        setMsg("Logged in successfully");
      }
    } catch (err) {
      const message = err.response?.data?.msg || "Error";
      setMsg(message);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto" }}>
      <h2>{mode === "login" ? "Login" : "Register"}</h2>

      <form onSubmit={handleSubmit}>
        {mode === "register" && (
          <div style={{ marginBottom: "10px" }}>
            <label>
              Name:
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
          </div>
        )}

        <div style={{ marginBottom: "10px" }}>
          <label>
            Email:
            <input
              type="email"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label>
            Password:
            <input
              type="password"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        </div>

        <button type="submit">
          {mode === "login" ? "Login" : "Register"}
        </button>
      </form>

      {msg && <p style={{ marginTop: "10px" }}>{msg}</p>}

      <button
        style={{ marginTop: "10px" }}
        type="button"
        onClick={() =>
          setMode(mode === "login" ? "register" : "login")
        }
      >
        Switch to {mode === "login" ? "Register" : "Login"}
      </button>
    </div>
  );
}
