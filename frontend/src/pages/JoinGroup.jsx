import React, { useState } from "react";

export default function JoinGroup() {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  const handleJoin = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!code.trim()) {
      setMsg("Please enter a valid group code.");
      return;
    }

    try {
      const token = localStorage.getItem("vsgp_token");

      const res = await fetch(`http://127.0.0.1:5000/groups/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data.msg || "Failed to join group.");
        return;
      }

      // لو انضم نروح لصفحة القروبات
      window.location.href = "/groups";
    } catch (err) {
      console.error(err);
      setMsg("Network error.");
    }
  };

  return (
    <div className="join-container" style={{ padding: "3rem" }}>
      <h2>Join a Group</h2>

      <form onSubmit={handleJoin} style={{ marginTop: "1.5rem" }}>
        <label style={{ display: "block", marginBottom: "1rem" }}>
          Enter Group Code:
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ABC123"
            style={{
              display: "block",
              padding: "0.7rem",
              marginTop: "0.5rem",
              width: "250px",
            }}
          />
        </label>

        {msg && (
          <p style={{ marginTop: "1rem", color: "red" }}>
            {msg}
          </p>
        )}

        <button
          type="submit"
          style={{
            padding: "0.7rem 1.5rem",
            marginTop: "1rem",
            cursor: "pointer",
            background: "#4a6cf7",
            color: "white",
            border: "none",
          }}
        >
          Join Group
        </button>
      </form>
    </div>
  );
}
