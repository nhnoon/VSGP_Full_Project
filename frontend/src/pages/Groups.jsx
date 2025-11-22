import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5000";

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get(`${API_BASE}/groups/`)
      .then((res) => setGroups(res.data))
      .catch((err) => {
        console.error(err);
        setMsg("Failed to load groups");
      });
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!name.trim()) {
      setMsg("Please enter a group name");
      return;
    }

    try {
      const res = await axios.post(`${API_BASE}/groups/`, { name });
      setGroups((prev) => [res.data, ...prev]);
      setName("");
      setMsg("Group created");
    } catch (err) {
      console.error(err);
      setMsg("Error creating group");
    }
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Are you sure you want to delete this group?");
    if (!ok) return;

    try {
      await axios.delete(`${API_BASE}/groups/${id}`);
      setGroups((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      console.error(err);
      setMsg("Error deleting group");
    }
  };

  const openDashboard = (id) => {
    navigate(`/groups/${id}`);
  };

  return (
    <div>
      <h2 className="page-title">Your Study Groups</h2>

      <form onSubmit={handleCreate} className="card form-card">
        <label className="field-label">
          Group name
          <input
            className="text-input"
            placeholder="e.g. COE201 - Midterm Revision"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button type="submit" className="btn primary">
          Create Group
        </button>
      </form>

      {msg && <p className="status-msg">{msg}</p>}

      <div className="card">
        {groups.length === 0 ? (
          <p className="empty-text">No groups yet. Create your first group ✨</p>
        ) : (
          <ul className="group-list">
            {groups.map((g) => (
              <li key={g.id} className="group-item">
                <div className="group-info">
                  <span className="group-name">{g.name}</span>
                  <span className="group-meta">ID: {g.id}</span>
                </div>
                <div className="group-actions">
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => openDashboard(g.id)}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className="btn danger"
                    onClick={() => handleDelete(g.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

