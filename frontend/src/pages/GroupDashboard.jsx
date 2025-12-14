// src/pages/GroupDashboard.jsx
import "./GroupDashboard.css";
import React, { useEffect, useState } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { authFetch } from "../utils/api";
import "./GroupDashboard.css";

const TABS = ["overview", "members", "files", "chat", "tasks", "sessions"];

export default function GroupDashboard() {
  const { groupId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // ----------------- STATE الأساسية -----------------
  const [group, setGroup] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [files, setFiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);

  // للتايمر حق السيشنز (يتحدّث كل ثانية)
  const [now, setNow] = useState(Date.now());

  // فورمات الإدخال
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    due_date: "",
    priority: "Normal",
  });

  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  const [newSession, setNewSession] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    duration_minutes: 60,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // هل المستخدم مالك القروب / أدمن
  const [isOwner, setIsOwner] = useState(
    location.state?.group?.isOwner ||
      location.state?.group?.role === "admin" ||
      false
  );

  const handleDeleteGroup = async () => {
    if (!window.confirm("Are you sure you want to delete this group?")) return;

    try {
      const res = await authFetch(`/groups/${groupId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.msg || "Error deleting group.");
        return;
      }

      alert("Group deleted.");
      navigate("/groups");
    } catch (err) {
      console.error(err);
      alert("Error deleting group.");
    }
  };

  // ----------------- تايمر عام للسيشنز -----------------
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(id);
  }, []);

  // ----------------- تحميل البيانات من الباك إند -----------------
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        // تفاصيل القروب
        const groupRes = await authFetch(`/groups/${groupId}`, {
          method: "GET",
        });
        const groupData = await groupRes.json().catch(() => ({}));
        setGroup(groupData);

        if (typeof groupData.is_owner === "boolean") {
          setIsOwner(groupData.is_owner);
        }

        // الأعضاء
        const membersRes = await authFetch(`/groups/${groupId}/members`, {
          method: "GET",
        });
        const membersData = await membersRes.json().catch(() => []);
        if (Array.isArray(membersData)) setMembers(membersData);

        // التاسكات
        const tasksRes = await authFetch(`/groups/${groupId}/tasks`, {
          method: "GET",
        });
        const tasksData = await tasksRes.json().catch(() => []);
        if (Array.isArray(tasksData)) setTasks(tasksData);

        // الملفات
        const filesRes = await authFetch(`/groups/${groupId}/files`, {
          method: "GET",
        });
        const filesData = await filesRes.json().catch(() => []);
        if (Array.isArray(filesData)) setFiles(filesData);

        // الرسائل
        const messagesRes = await authFetch(`/groups/${groupId}/messages`, {
          method: "GET",
        });
        const messagesData = await messagesRes.json().catch(() => []);
        if (Array.isArray(messagesData)) setMessages(messagesData);

        // السيشنز
        try {
          const sessionsRes = await authFetch(`/groups/${groupId}/sessions`, {
            method: "GET",
          });
          const sessionsData = await sessionsRes.json().catch(() => []);
          if (Array.isArray(sessionsData)) setSessions(sessionsData);
        } catch (e) {
          console.error("Error loading sessions", e);
        }
      } catch (err) {
        console.error(err);
        setError(err.message || "Error loading group data.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [groupId]);

  // ----------------- رابط الدعوة -----------------
  const handleCopyInvite = () => {
    if (!group?.invite_code) return;
    const link = `${window.location.origin}/join?code=${group.invite_code}`;
    navigator.clipboard
      .writeText(link)
      .then(() => alert("Invite link copied!"))
      .catch(() => alert("Could not copy link."));
  };

  // ================= TASKS =================

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      const res = await authFetch(`/groups/${groupId}/tasks`, {
        method: "POST",
        body: JSON.stringify(newTask),
      });
      const data = await res.json().catch(() => ({}));

      setTasks((prev) => [...prev, data]);
      setNewTask({
        title: "",
        description: "",
        due_date: "",
        priority: "Normal",
      });
    } catch (err) {
      console.error(err);
      alert(err.message || "Error adding task.");
    }
  };

  const toggleTaskDone = async (task) => {
    try {
      const res = await authFetch(`/groups/${groupId}/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !task.completed }),
      });
      const data = await res.json().catch(() => ({}));

      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, ...data } : t))
      );
    } catch (err) {
      console.error(err);
      alert("Error updating task.");
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await authFetch(`/groups/${groupId}/tasks/${taskId}`, {
        method: "DELETE",
      });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error(err);
      alert("Error deleting task.");
    }
  };

  // ================= MEMBERS =================

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMember.name.trim()) return;

    try {
      const res = await authFetch(`/groups/${groupId}/members`, {
        method: "POST",
        body: JSON.stringify(newMember),
      });
      const data = await res.json().catch(() => ({}));

      setMembers((prev) => [...prev, data]);
      setNewMember({ name: "", email: "" });
    } catch (err) {
      console.error(err);
      alert(err.message || "Error adding member.");
    }
  };

  const removeMember = async (memberId) => {
    if (!window.confirm("Remove this member?")) return;

    try {
      await authFetch(`/groups/${groupId}/members/${memberId}`, {
        method: "DELETE",
      });
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err) {
      console.error(err);
      alert("Error removing member.");
    }
  };

  // ================= FILES =================

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);

    setUploading(true);
    try {
      const res = await authFetch(`/groups/${groupId}/files`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      setFiles((prev) => [...prev, data]);
      setSelectedFile(null);
      e.target.reset();
    } catch (err) {
      console.error(err);
      alert(err.message || "Error uploading file.");
    } finally {
      setUploading(false);
    }
  };

  // ================= CHAT =================

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content) return;

    setSending(true);
    try {
      const res = await authFetch(`/groups/${groupId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      const data = await res.json().catch(() => ({}));

      setMessages((prev) => [...prev, data]);
      setNewMessage("");
    } catch (err) {
      console.error(err);
      alert(err.message || "Error sending message.");
    } finally {
      setSending(false);
    }
  };

  // ================= HELPERS & STATS =================

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalTasks = tasks.length;
  const progressPercent =
    totalTasks === 0 ? 0 : Math.round((completedCount / totalTasks) * 100);

  const filesCount = files.length;

  const formatDateTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return `${d.toLocaleDateString()} • ${d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  const getDurationMinutes = (session) => {
    if (session && session.duration_minutes != null) {
      const n = Number(session.duration_minutes);
      if (!Number.isNaN(n) && n > 0) return n;
    }
    if (session && session.start_time && session.end_time) {
      const start = new Date(session.start_time);
      const end = new Date(session.end_time);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        const diff = (end - start) / 60000;
        if (diff > 0) return Math.round(diff);
      }
    }
    return 60;
  };

  const getPriorityClass = (priority) => {
    switch ((priority || "").toLowerCase()) {
      case "high":
        return "priority-badge priority-high";
      case "low":
        return "priority-badge priority-low";
      default:
        return "priority-badge priority-normal";
    }
  };

  // ================= OVERVIEW EXTRA (for UI) =================
  const upcomingSessions = sessions
    .filter((s) => s.start_time)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    .slice(0, 3);

  const recentFiles = files.slice(-3).reverse();
  const recentTasks = tasks.slice(-4).reverse();

  // ================= SESSIONS =================

  const handleAddSession = async (e) => {
    e.preventDefault();

    const { title, description, date, time, duration_minutes } = newSession;

    if (!title.trim()) {
      alert("Title is required");
      return;
    }

    if (!date || !time) {
      alert("Please choose both date and time");
      return;
    }

    const start_time = `${date}T${time}:00`;

    const payload = {
      title: title.trim(),
      description: (description || "").trim(),
      start_time,
      duration_minutes: Number(duration_minutes) || 60,
    };

    try {
      const res = await authFetch(`/groups/${groupId}/sessions`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      setSessions((prev) => [...prev, data]);
      setNewSession({
        title: "",
        description: "",
        date: "",
        time: "",
        duration_minutes: 60,
      });
    } catch (err) {
      console.error(err);
      alert(err.message || "Error creating session");
    }
  };

  const deleteSession = async (sessionId) => {
    if (!window.confirm("Delete this session?")) return;
    try {
      await authFetch(`/groups/${groupId}/sessions/${sessionId}`, {
        method: "DELETE",
      });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      console.error(err);
      alert("Error deleting session.");
    }
  };

  // ================= UI =================

  return (
    <div className="gd-page">
      <aside className="gd-sidebar">
        <Link to="/groups" className="gd-back-link">
          ← All groups
        </Link>

        {group && (
          <div className="gd-side-card">
            <div className="gd-side-label">Group</div>
            <div className="gd-side-title">{group.name}</div>
          </div>
        )}

        <nav className="gd-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={"gd-tab" + (activeTab === tab ? " active" : "")}
              onClick={() => setActiveTab(tab)}
            >
              {tab[0].toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </aside>

      <section className="gd-main">
        {error && <div className="gd-error">{error}</div>}
        {loading && <p>Loading...</p>}

        {!loading && !error && group && (
          <>
            {/* ================= OVERVIEW (NEW UI) ================= */}
            {activeTab === "overview" && (
              <div className="gd-overview">
                <div className="gd-header">
                  <div>
                    <h2 className="gd-title">{group.name}</h2>
                    <p className="gd-subtitle">Group ID: {group.id}</p>
                  </div>

                  <div className="gd-header-actions">
                    <div className="gd-invite">
                      <div className="gd-invite-label">Invite code</div>
                      <div className="gd-invite-code">
                        {group.invite_code || "———"}
                      </div>
                      <button className="gd-pill" onClick={handleCopyInvite}>
                        Copy invite link
                      </button>
                    </div>

                    {isOwner && (
                      <button className="gd-danger" onClick={handleDeleteGroup}>
                        Delete group
                      </button>
                    )}
                  </div>
                </div>

                {/* STAT CARDS */}
                <div className="gd-stats">
                  <div className="gd-stat">
                    <div className="gd-stat-label">Members</div>
                    <div className="gd-stat-value">
                      {group.members_count ?? members.length}
                    </div>
                  </div>
                  <div className="gd-stat">
                    <div className="gd-stat-label">Files</div>
                    <div className="gd-stat-value">{filesCount}</div>
                  </div>
                  <div className="gd-stat">
                    <div className="gd-stat-label">Tasks</div>
                    <div className="gd-stat-value">{totalTasks}</div>
                  </div>
                  <div className="gd-stat">
                    <div className="gd-stat-label">Progress</div>
                    <div className="gd-stat-value">{progressPercent}%</div>
                  </div>
                </div>

                {/* PROGRESS BAR */}
                <div className="gd-progress">
                  <div className="gd-progress-top">
                    Overall progress{" "}
                    <strong>
                      {completedCount} / {totalTasks || 1} completed (
                      {progressPercent}%)
                    </strong>
                  </div>
                  <div className="gd-progress-bar">
                    <div
                      className="gd-progress-fill"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* GRID PANELS (like your screenshot) */}
                <div className="gd-grid">
                  <div className="gd-panel">
                    <div className="gd-panel-title">Recent Tasks</div>
                    {recentTasks.length === 0 ? (
                      <p className="gd-muted">No tasks yet.</p>
                    ) : (
                      recentTasks.map((t) => (
                        <div key={t.id} className="gd-row">
                          <span className={"gd-dot " + (t.completed ? "ok" : "")} />
                          <span className={t.completed ? "gd-done" : ""}>
                            {t.title}
                          </span>
                        </div>
                      ))
                    )}
                    <button
                      className="gd-link-btn"
                      onClick={() => setActiveTab("tasks")}
                    >
                      View all tasks →
                    </button>
                  </div>

                  <div className="gd-panel">
                    <div className="gd-panel-title">Upcoming Sessions</div>
                    {upcomingSessions.length === 0 ? (
                      <p className="gd-muted">No upcoming sessions.</p>
                    ) : (
                      upcomingSessions.map((s) => (
                        <div key={s.id} className="gd-row">
                          <span className="gd-chip">📅</span>
                          <span>
                            <strong>{s.title || "Session"}</strong>
                            <div className="gd-small">
                              {formatDateTime(s.start_time)} •{" "}
                              {getDurationMinutes(s)} min
                            </div>
                          </span>
                        </div>
                      ))
                    )}
                    <button
                      className="gd-link-btn"
                      onClick={() => setActiveTab("sessions")}
                    >
                      Manage sessions →
                    </button>
                  </div>

                  <div className="gd-panel">
                    <div className="gd-panel-title">Latest Files</div>
                    {recentFiles.length === 0 ? (
                      <p className="gd-muted">No files uploaded.</p>
                    ) : (
                      recentFiles.map((f, idx) => (
                        <div key={f.id || idx} className="gd-row">
                          <span className="gd-chip">📄</span>
                          <span>{f.name || f.filename || `File #${f.id}`}</span>
                        </div>
                      ))
                    )}
                    <button
                      className="gd-link-btn"
                      onClick={() => setActiveTab("files")}
                    >
                      View files →
                    </button>
                  </div>

                  <div className="gd-panel">
                    <div className="gd-panel-title">Quick Chat</div>
                    {messages.length === 0 ? (
                      <p className="gd-muted">No messages yet.</p>
                    ) : (
                      messages
                        .slice(-3)
                        .reverse()
                        .map((msg) => (
                          <div key={msg.id} className="gd-row">
                            <span className="gd-chip">💬</span>
                            <span className="gd-small">
                              {msg.content}
                            </span>
                          </div>
                        ))
                    )}
                    <button
                      className="gd-link-btn"
                      onClick={() => setActiveTab("chat")}
                    >
                      Open chat →
                    </button>
                  </div>
                </div>

                <p className="gd-muted" style={{ marginTop: 12 }}>
                  This dashboard summarizes your group activity (members, files,
                  tasks, sessions) in one place.
                </p>
              </div>
            )}

            {/* ================= باقي التابات مثل ملفك (بدون حذف) ================= */}

            {activeTab === "members" && (
              <div className="card">
                {/* (نفس كود members عندك بدون تعديل) */}
                <div className="card-header-row">
                  <h2 className="card-title">Members</h2>
                  <span className="badge">
                    {members.length} {members.length === 1 ? "member" : "members"}
                  </span>
                </div>

                <form className="inline-form" onSubmit={handleAddMember}>
                  <div className="inline-form-row">
                    <input
                      className="auth-input"
                      type="text"
                      placeholder="Student name"
                      value={newMember.name}
                      onChange={(e) =>
                        setNewMember((m) => ({ ...m, name: e.target.value }))
                      }
                      required
                    />
                    <input
                      className="auth-input"
                      type="email"
                      placeholder="student@example.com"
                      value={newMember.email}
                      onChange={(e) =>
                        setNewMember((m) => ({ ...m, email: e.target.value }))
                      }
                    />
                    <button type="submit" className="btn-primary-small">
                      Add member
                    </button>
                  </div>
                </form>

                <ul className="members-list">
                  {members.map((m) => (
                    <li key={m.id} className="members-item">
                      <div>
                        <div className="member-name">{m.name}</div>
                        {m.email && <div className="member-email">{m.email}</div>}
                      </div>

                      <div className="member-role">{m.role || "Member"}</div>

                      {isOwner && (
                        <button
                          className="btn-danger-small"
                          onClick={() => removeMember(m.id)}
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  ))}

                  {members.length === 0 && (
                    <p className="muted-text">
                      No members yet. Add your first member using the form above.
                    </p>
                  )}
                </ul>
              </div>
            )}

            {activeTab === "files" && (
              <div className="card">
                {/* (نفس كود files عندك بدون حذف) */}
                <h2 className="card-title">Files</h2>
                <p className="muted-text">
                  Upload lecture notes, screenshots, or any study resources for this group.
                </p>

                <form className="tasks-form" onSubmit={handleFileUpload}>
                  <div className="tasks-form-row">
                    <input
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                    />
                    <button
                      type="submit"
                      className="btn-primary-small"
                      disabled={uploading || !selectedFile}
                    >
                      {uploading ? "Uploading..." : "Upload file"}
                    </button>
                  </div>
                </form>

                <div className="files-list">
                  {files.length === 0 ? (
                    <p className="muted-text" style={{ marginTop: "12px" }}>
                      No files yet. Upload your first file above.
                    </p>
                  ) : (
                    files.map((f) => (
                      <div key={f.id || f.filename} className="file-item">
                        <span className="file-name">
                          {f.name || f.filename || `File #${f.id}`}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "chat" && (
              <div className="card">
                {/* (نفس كود chat عندك) */}
                <h2 className="card-title">Group chat</h2>
                <p className="muted-text">
                  Use this simple chat to leave notes and updates for your study group.
                </p>

                <div className="chat-box">
                  <div className="chat-messages">
                    {messages.length === 0 ? (
                      <p className="muted-text">
                        No messages yet. Start the conversation below ✨
                      </p>
                    ) : (
                      messages.map((msg) => (
                        <div key={msg.id} className="chat-message">
                          <div className="chat-meta">
                            <span className="chat-author">Member</span>
                            <span className="chat-time">
                              {msg.created_at || ""}
                            </span>
                          </div>
                          <div className="chat-content">{msg.content}</div>
                        </div>
                      ))
                    )}
                  </div>

                  <form className="chat-form" onSubmit={handleSendMessage}>
                    <input
                      className="chat-input"
                      type="text"
                      placeholder="Write a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="btn-primary-small"
                      disabled={sending || !newMessage.trim()}
                    >
                      {sending ? "Sending..." : "Send"}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {activeTab === "tasks" && (
              <div className="card">
                {/* (نفس كود tasks عندك) */}
                <div className="card-header-row">
                  <h2 className="card-title">Tasks &amp; Assignments</h2>
                  <span className="badge">{totalTasks} tasks</span>
                </div>

                <p className="muted-text">
                  Create tasks for this study group, set due dates, add descriptions, set priority and track progress.
                </p>

                <form className="tasks-form" onSubmit={handleAddTask}>
                  <div className="tasks-form-row">
                    <input
                      className="auth-input"
                      type="text"
                      placeholder="e.g. Chapter 3 summary"
                      value={newTask.title}
                      onChange={(e) =>
                        setNewTask((t) => ({ ...t, title: e.target.value }))
                      }
                      required
                    />
                    <input
                      className="auth-input"
                      type="text"
                      placeholder="Details about this task..."
                      value={newTask.description}
                      onChange={(e) =>
                        setNewTask((t) => ({
                          ...t,
                          description: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="tasks-form-row">
                    <input
                      className="auth-input"
                      type="date"
                      value={newTask.due_date}
                      onChange={(e) =>
                        setNewTask((t) => ({
                          ...t,
                          due_date: e.target.value,
                        }))
                      }
                    />
                    <select
                      className="auth-input"
                      value={newTask.priority}
                      onChange={(e) =>
                        setNewTask((t) => ({ ...t, priority: e.target.value }))
                      }
                    >
                      <option>Low</option>
                      <option>Normal</option>
                      <option>High</option>
                    </select>
                    <button type="submit" className="btn-primary-small">
                      Add task
                    </button>
                  </div>
                </form>

                <div className="tasks-progress">
                  <div>
                    Overall progress{" "}
                    <strong>
                      {completedCount} / {totalTasks || 1} completed ({progressPercent}%)
                    </strong>
                  </div>
                </div>

                <div className="tasks-list">
                  {tasks.map((task) => (
                    <div key={task.id} className="task-item">
                      <div className="task-main">
                        <input
                          type="checkbox"
                          checked={!!task.completed}
                          onChange={() => toggleTaskDone(task)}
                        />
                        <div>
                          <div className="task-title">{task.title}</div>
                          {task.description && (
                            <div className="task-desc">{task.description}</div>
                          )}
                          <div className="task-meta">
                            {task.due_date && <span>📅 Due: {task.due_date}</span>}
                            <span className={getPriorityClass(task.priority)}>
                              {task.priority || "Normal"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        className="btn-danger-small"
                        onClick={() => deleteTask(task.id)}
                      >
                        Delete
                      </button>
                    </div>
                  ))}

                  {tasks.length === 0 && (
                    <p className="muted-text">
                      No tasks yet. Add your first task using the form above.
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "sessions" && (
              <div className="card">
                {/* (نفس كود sessions عندك) */}
                <div className="card-header-row">
                  <h2 className="card-title">Study Sessions</h2>
                  <span className="badge">
                    {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
                  </span>
                </div>

                <p className="muted-text">
                  Plan your shared study sessions for this group: topic, date, time and duration.
                </p>

                <form className="tasks-form" onSubmit={handleAddSession}>
                  <div className="tasks-form-row">
                    <input
                      className="auth-input"
                      type="text"
                      placeholder="Session title (e.g. Midterm review)"
                      value={newSession.title}
                      onChange={(e) =>
                        setNewSession((s) => ({ ...s, title: e.target.value }))
                      }
                      required
                    />
                    <input
                      className="auth-input"
                      type="text"
                      placeholder="Agenda / chapters"
                      value={newSession.description}
                      onChange={(e) =>
                        setNewSession((s) => ({
                          ...s,
                          description: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="tasks-form-row">
                    <input
                      className="auth-input"
                      type="date"
                      value={newSession.date}
                      onChange={(e) =>
                        setNewSession((s) => ({ ...s, date: e.target.value }))
                      }
                      required
                    />
                    <input
                      className="auth-input"
                      type="time"
                      value={newSession.time}
                      onChange={(e) =>
                        setNewSession((s) => ({ ...s, time: e.target.value }))
                      }
                      required
                    />
                    <input
                      className="auth-input"
                      type="number"
                      min="15"
                      step="5"
                      value={newSession.duration_minutes}
                      onChange={(e) =>
                        setNewSession((s) => ({
                          ...s,
                          duration_minutes: e.target.value,
                        }))
                      }
                    />
                    <button type="submit" className="btn-primary-small">
                      Add session
                    </button>
                  </div>
                </form>

                <div className="tasks-list">
                  {sessions.length === 0 ? (
                    <p className="muted-text">
                      No sessions yet. Add your first shared study session above.
                    </p>
                  ) : (
                    sessions.map((session) => {
                      const durationMinutes = getDurationMinutes(session);
                      return (
                        <div key={session.id} className="task-item">
                          <div className="task-main">
                            <div>
                              <div className="task-title">{session.title || "Study session"}</div>
                              {session.description && (
                                <div className="task-desc">{session.description}</div>
                              )}
                              <div className="task-meta">
                                {session.start_time && (
                                  <span>📅 {formatDateTime(session.start_time)}</span>
                                )}
                                {durationMinutes && (
                                  <span style={{ marginLeft: "6px" }}>
                                    ⏱ {durationMinutes} min
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            className="btn-danger-small"
                            onClick={() => deleteSession(session.id)}
                          >
                            Delete
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
