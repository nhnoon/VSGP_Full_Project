import React from "react";
import { NavLink, useNavigate } from "react-router-dom";

export default function Sidebar() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("vsgp_token");
    navigate("/login");
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logoDot">S</div>
        <div className="brandText">
          <div className="title">Syno</div>
          <div className="sub">Study Platform</div>
        </div>
      </div>

      <nav className="nav">
        <NavLink to="/dashboard">🏠 Dashboard</NavLink>
        <NavLink to="/groups">👥 Groups</NavLink>
      </nav>

      <div className="sidebarFooter">
        <button className="logoutBtn" onClick={logout}>
          Logout
        </button>
      </div>
    </aside>
  );
}
