import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../utils/api";

/* ===================== Groups Page ===================== */
export default function Groups() {
  const [myGroups, setMyGroups] = useState([]); // ✅ only joined groups
  const [allGroups, setAllGroups] = useState([]); // ✅ explore list
  const [newGroupName, setNewGroupName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const myGroupIds = useMemo(() => new Set(myGroups.map((g) => g.id)), [myGroups]);

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
        // 1) load "/groups"
        const res = await authFetch("/groups", { method: "GET" });
        const data = await res.json().catch(() => []);

        const arr = Array.isArray(data)
          ? data
          : Array.isArray(data.groups)
          ? data.groups
          : [];

        // ✅ لو backend يرجّع ALL groups ومعاها is_member -> نخلي "myGroups" فقط المنضم لها
        const mineOnly = arr.filter((g) => g?.is_member === true);

        setMyGroups(mineOnly);

        // 2) load explore
        try {
          const allRes = await authFetch("/groups/explore", { method: "GET" });
          const allData = await allRes.json().catch(() => []);

          const allArr = Array.isArray(allData)
            ? allData
            : Array.isArray(allData.groups)
            ? allData.groups
            : [];

          setAllGroups(allArr);
        } catch (e) {
          // fallback: لو explore مو شغال، نستخدم arr كـ allGroups
          setAllGroups(arr);
        }
      } catch (err) {
        setError(err.message || "Failed to load groups");
        setMyGroups([]);
        setAllGroups([]);
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
      const res = await authFetch("/groups", {
        method: "POST",
        body: JSON.stringify({ name }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.msg || "Failed to create group");

      // group created => admin => عضو تلقائي
      const created = {
        id: data.id,
        name: data.name || name,
        invite_code: data.invite_code,
        role: data.role || "admin",
        is_member: true,
      };

      setMyGroups((prev) => [...prev, created]);
      setNewGroupName("");

      // حدّث allGroups (عشان يظهر هناك كمان)
      setAllGroups((prev) => {
        const exists = prev.some((g) => g.id === created.id);
        if (exists) return prev;
        return [...prev, { ...created, members_count: 1 }];
      });

      navigate(`/groups/${created.id}`, { state: { group: created } });
    } catch (err) {
      setError(err.message || "Error creating group.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGroup = async (e, groupId) => {
    e.stopPropagation();
    if (!window.confirm("Delete this group?")) return;

    try {
      const res = await authFetch(`/groups/${groupId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.msg || `Failed to delete group (${res.status})`);

      setMyGroups((prev) => prev.filter((g) => g.id !== groupId));
      setAllGroups((prev) => prev.filter((g) => g.id !== groupId));
      alert("Group deleted ✅");
    } catch (err) {
      alert(err.message || "Error deleting group");
    }
  };

  const handleJoinGroup = async (group) => {
    // join via invite code
    if (!group.invite_code) {
      alert("This group has no invite code. (Request flow needs an endpoint)");
      return;
    }

    try {
      const res = await authFetch("/groups/join", {
        method: "POST",
        body: JSON.stringify({ code: group.invite_code }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.msg || "Error joining group.");
        return;
      }

      // ✅ add to myGroups if not exists
      setMyGroups((prev) => {
        if (prev.some((g) => g.id === data.id)) return prev;
        return [...prev, { ...data, is_member: true }];
      });

      // ✅ update allGroups joined badge
      setAllGroups((prev) =>
        prev.map((g) =>
          g.id === data.id
            ? { ...g, is_member: true, members_count: data.members_count ?? g.members_count }
            : g
        )
      );

      alert("Joined the group successfully ✅");
    } catch (err) {
      alert("Error joining group.");
    }
  };

  return (
    <div className="groups-page">
      <div className="groups-header">
        <h1>Your Study Groups</h1>
        <p>Manage your Syno groups, tasks, files and members in one place.</p>
      </div>

      {/* CREATE + MY GROUPS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>
        {/* CREATE */}
        <div
          className="groups-create-card"
          style={{
            background: "#fff",
            border: "1px solid #e9eaf2",
            borderRadius: 16,
            padding: 18,
          }}
        >
          <h2>Create a new group</h2>
          <form onSubmit={handleCreateGroup} style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <input
              type="text"
              placeholder="e.g. CS 321 – Midterm Squad"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #e9eaf2",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={creating}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "none",
                background: "#2563eb",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {creating ? "Creating..." : "Create group"}
            </button>
          </form>
          {error && <div style={{ marginTop: 10, color: "#dc2626" }}>{error}</div>}
        </div>

        {/* MY GROUPS */}
        <div
          className="groups-list-card"
          style={{
            background: "#fff",
            border: "1px solid #e9eaf2",
            borderRadius: 16,
            padding: 18,
          }}
        >
          <h2>Your groups</h2>

          {loading ? (
            <p>Loading...</p>
          ) : myGroups.length === 0 ? (
            <p>You don't have any groups yet. Create or join one ✨</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, marginTop: 10, display: "grid", gap: 10 }}>
              {myGroups.map((g) => (
                <li
                  key={g.id}
                  onClick={() => handleOpenGroup(g.id, g)}
                  style={{
                    border: "1px solid #eef0f7",
                    borderRadius: 14,
                    padding: 14,
                    cursor: "pointer",
                    background: "#fff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>{g.name}</div>
                      {g.invite_code && (
                        <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
                          Invite code: {g.invite_code}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {g.role && (
                        <span
                          style={{
                            fontSize: 12,
                            padding: "6px 10px",
                            borderRadius: 999,
                            background: g.role === "admin" ? "#ede9fe" : "#e5f0ff",
                            color: g.role === "admin" ? "#5b21b6" : "#1d4ed8",
                            fontWeight: 800,
                          }}
                        >
                          {g.role === "admin" ? "Admin" : "Member"}
                        </span>
                      )}

                      {g.role === "admin" && (
                        <button
                          onClick={(e) => handleDeleteGroup(e, g.id)}
                          style={{
                            background: "#dc2626",
                            color: "#fff",
                            border: "none",
                            padding: "8px 10px",
                            borderRadius: 12,
                            cursor: "pointer",
                            fontWeight: 800,
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ALL GROUPS */}
      <div
        className="groups-list-card"
        style={{
          marginTop: 22,
          background: "#fff",
          border: "1px solid #e9eaf2",
          borderRadius: 16,
          padding: 18,
        }}
      >
        <h2>All groups</h2>

        {loading ? (
          <p>Loading...</p>
        ) : allGroups.length === 0 ? (
          <p>No groups found.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, marginTop: 10, display: "grid", gap: 10 }}>
            {allGroups.map((g) => {
              const isMember = g.is_member === true || myGroupIds.has(g.id);

              return (
                <li
                  key={g.id}
                  onClick={() => isMember && handleOpenGroup(g.id, g)}
                  style={{
                    border: "1px solid #eef0f7",
                    borderRadius: 14,
                    padding: 14,
                    cursor: isMember ? "pointer" : "default",
                    background: "#fff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>{g.name}</div>
                      {g.invite_code && (
                        <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
                          Invite code: {g.invite_code}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          fontSize: 12,
                          padding: "6px 10px",
                          borderRadius: 999,
                          background: isMember ? "#ecfdf5" : "#f3f4f6",
                          color: isMember ? "#065f46" : "#374151",
                          fontWeight: 800,
                        }}
                      >
                        {isMember ? "Joined" : `${g.members_count || 0} members`}
                      </span>

                      {!isMember && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJoinGroup(g);
                          }}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 12,
                            border: "none",
                            background: "#2563eb",
                            color: "#fff",
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          Join group
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
