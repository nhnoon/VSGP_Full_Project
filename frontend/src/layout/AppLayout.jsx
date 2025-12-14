import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "./appLayout.css";

export default function AppLayout() {
  return (
    <div className="appShell">
      <Sidebar />
      <main className="appMain">
        <div className="appContainer">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
