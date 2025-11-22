import { Routes, Route, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Login from "./pages/Login.jsx";
import Groups from "./pages/Groups.jsx";
import GroupDashboard from "./pages/GroupDashboard.jsx";
import "./styles.css";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken("");
    navigate("/login");
  };

  return (
    <>
      <header className="header">
        <div className="logo-section">
          <img src="/syno_logo.png" alt="Syno" className="logo" />
          <div className="logo-text">
            <h1>Syno</h1>
            <span>Study Platform</span>
          </div>
        </div>

        <nav>
          <Link to="/" className="nav-link">
            Home
          </Link>

          {!token ? (
            <Link to="/login" className="btn primary">
              Login / Register
            </Link>
          ) : (
            <button onClick={handleLogout} className="btn danger">
              Logout
            </button>
          )}
        </nav>
      </header>

      <main className="page">
        <Routes>
          <Route path="/login" element={<Login onLogin={setToken} />} />
          <Route path="/" element={<Groups />} />
          <Route path="/groups/:id" element={<GroupDashboard />} />
        </Routes>
      </main>
    </>
  );
}
