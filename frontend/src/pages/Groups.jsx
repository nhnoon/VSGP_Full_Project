// frontend/src/pages/Groups.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../utils/api";

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // load user groups after login
  useEffect(() => {
    const token = localStorage.getItem("vsgp_token");
    if (!token) {
      navigate("/login");
      return;
    }

    async function loadGroups() {
      setLoading(true);
      setError("");

      try {
        const res = await authFetch("/groups/", { method: "GET" });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(
            typeof data.msg === "string"
              ? data.msg
              : "Failed to load groups"
          );
        }

        if (Array.isArray(data)) {
          setGroups(data);
        } else if (Array.isArray(data.groups)) {
          setGroups(data.groups);
        } else {
          setGroups([]);
        }
      } catch (err) {
        console.error(err);
        setError("Error loading groups. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadGroups();
  }, [navigate]);

  const handleOpenGroup = (groupId, groupObj) => {
    if (!groupId) return;
    navigate(`/groups/${groupId}`, { state: { group: groupObj } });
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setError("");

    const name = newGroupName.trim();
    if (!name) {
      setError("Please enter a group name.");
      return;
    }

    setCreating(true);

    try {
      const res = await authFetch("/groups/", {
        method: "POST",
        body: JSON.stringify({ name }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          typeof data.msg === "string"
            ? data.msg
            : "Failed to create group"
        );
      }

      const newGroup = {
        id: data.id,
        name: data.name || name,
        invite_code: data.invite_code,
        role: data.role || "admin",
        isOwner: data.is_owner ?? true,
      };

      setGroups((prev) => [...prev, newGroup]);
      setNewGroupName("");

      if (newGroup.id) {
        navigate(`/groups/${newGroup.id}`, { state: { group: newGroup } });
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Error creating group.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="groups-page">
      <div className="groups-header">
        <h1>Your Study Groups</h1>
        <p>Manage your Syno groups, tasks, files and members in one place.</p>
      </div>

      <div className="groups-content">
        {/* Create group card */}
        <div className="groups-create-card">
          <h2>Create a new group</h2>
          <form onSubmit={handleCreateGroup} className="groups-create-form">
            <input
              type="text"
              placeholder="e.g. CS 321 – Midterm Squad"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="groups-input"
            />
            <button
              type="submit"
              disabled={creating}
              className="groups-button"
            >
              {creating ? "Creating..." : "Create group"}
            </button>
          </form>
          {error && <div className="groups-error">{error}</div>}
        </div>

        {/* Groups list */}
        <div className="groups-list-card">
          <h2>Your groups</h2>

          {loading ? (
            <p>Loading groups...</p>
          ) : groups.length === 0 ? (
            <p>You don't have any groups yet. Create your first group above ✨</p>
          ) : (
            <ul className="groups-list">
              {groups.map((g) => (
                <li
                  key={g.id}
                  className="groups-item"
                  onClick={() => handleOpenGroup(g.id, g)}
                >
                  <div className="groups-item-main">
                    <h3>{g.name}</h3>
                    {g.role && (
                      <span className="groups-tag">
                        {g.role === "admin" ? "Admin" : "Member"}
                      </span>
                    )}
                  </div>
                  {g.invite_code && (
                    <p className="groups-item-desc">
                      Invite code: {g.invite_code}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
