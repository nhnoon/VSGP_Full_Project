import React from "react";
import { Routes, Route, useNavigate, Link, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Groups from "./pages/Groups";
import GroupDashboard from "./pages/GroupDashboard";
import JoinGroup from "./pages/JoinGroup"; 
import Register from "./pages/Register";


function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();

  const token = localStorage.getItem("vsgp_token");

  const handleLogout = () => {
    localStorage.removeItem("vsgp_token");
    navigate("/login");
  };

  const isAuthPage = location.pathname === "/" || location.pathname === "/login";

  return (
    <div className="app-shell">
      {/* أعلى الصفحة */}
      <header className="top-nav">
        <div className="top-nav-left" onClick={() => navigate("/groups")}>
          <div className="logo-circle">
            <span className="logo-icon">S</span>
          </div>
          <div className="logo-text">
            <div className="logo-title">Syno</div>
            <div className="logo-subtitle">Study Platform</div>
          </div>
        </div>

        <nav className="top-nav-right">
          <Link to={token ? "/groups" : "/login"} className="nav-link">
            Home
          </Link>

          {token ? (
            <button className="nav-button-danger" onClick={handleLogout}>
              Logout
            </button>
          ) : (
            <Link to="/login" className="nav-button-primary">
              Login / Register
            </Link>
          )}
        </nav>
      </header>

      {/* محتوى الصفحات */}
      <main className={isAuthPage ? "page-main auth-main" : "page-main"}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/groups/:groupId" element={<GroupDashboard />} />
          <Route path="/join" element={<JoinGroup />} />
          <Route path="/register" element={<Register />} />

        </Routes>
      </main>
    </div>
  );
}

export default AppShell;

