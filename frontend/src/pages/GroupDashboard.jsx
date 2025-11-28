import React, { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { authFetch } from "../utils/api";

const TABS = ["overview", "members", "files", "chat", "tasks"];

export default function GroupDashboard() {
  const { groupId } = useParams();
  const location = useLocation();

  const [group, setGroup] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [files, setFiles] = useState([]);
  const [messages, setMessages] = useState([]);

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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // هل المستخدم مالك القروب (owner/admin) بناء على الـ state القادم من /groups
  const [isOwner, setIsOwner] = useState(
    location.state?.group?.isOwner || location.state?.group?.role === "admin" || false
  );

  // تحميل بيانات القروب + الأعضاء + التاسكات + الملفات + الرسائل
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
        if (!groupRes.ok)
          throw new Error(groupData.msg || "Failed to load group.");
        setGroup(groupData);

        // لو الباك يرجّع is_owner نستخدمها
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
      } catch (err) {
        console.error(err);
        setError(err.message || "Error loading group data.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [groupId]);

  const handleCopyInvite = () => {
    if (!group?.invite_code) return;
    const link = `${window.location.origin}/join?code=${group.invite_code}`;
    navigator.clipboard
      .writeText(link)
      .then(() => alert("Invite link copied!"))
      .catch(() => alert("Could not copy link."));
  };

  /* ------------ TASKS ------------ */

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      const res = await authFetch(`/groups/${groupId}/tasks`, {
        method: "POST",
        body: JSON.stringify(newTask),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.msg || "Failed to add task.");

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
      if (!res.ok) throw new Error(data.msg || "Failed to update task.");

      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
      );
    } catch (err) {
      console.error(err);
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
    }
  };

  /* ------------ MEMBERS ------------ */

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMember.name.trim()) return;

    try {
      const res = await authFetch(`/groups/${groupId}/members`, {
        method: "POST",
        body: JSON.stringify(newMember),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.msg || "Failed to add member.");

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
    }
  };

  /* ------------ FILES ------------ */

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
      if (!res.ok) throw new Error(data.msg || "Failed to upload file.");

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

  /* ------------ CHAT ------------ */

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
      if (!res.ok) throw new Error(data.msg || "Failed to send message.");

      setMessages((prev) => [...prev, data]);
      setNewMessage("");
    } catch (err) {
      console.error(err);
      alert(err.message || "Error sending message.");
    } finally {
      setSending(false);
    }
  };

  /* ------------ STATS ------------ */

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalTasks = tasks.length;
  const progressPercent =
    totalTasks === 0 ? 0 : Math.round((completedCount / totalTasks) * 100);

  const filesCount = files.length;

  return (
    <div className="dashboard-page">
      <aside className="dashboard-sidebar">
        <Link to="/groups" className="back-link">
          ← All groups
        </Link>

        {group && (
          <div className="sidebar-group-card">
            <h4 className="sidebar-label">Group</h4>
            <div className="sidebar-group-name">{group.name}</div>
          </div>
        )}

        <nav className="sidebar-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={
                "sidebar-tab" +
                (activeTab === tab ? " sidebar-tab-active" : "")
              }
              onClick={() => setActiveTab(tab)}
            >
              {tab[0].toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </aside>

      <section className="dashboard-main">
        {error && <div className="auth-error">{error}</div>}
        {loading && <p>Loading...</p>}
        {!loading && !error && group && (
          <>
            {/* OVERVIEW */}
            {activeTab === "overview" && (
              <div className="card">
                <div className="card-header-row">
                  <div>
                    <h2 className="card-title">{group.name}</h2>
                    <p className="card-subtitle">Group ID: {group.id}</p>
                  </div>
                  <div className="invite-box">
                    <div className="invite-label">Invite code</div>
                    <div className="invite-code">
                      {group.invite_code || "———"}
                    </div>
                    <button className="small-pill-btn" onClick={handleCopyInvite}>
                      Copy invite link
                    </button>
                  </div>
                </div>

                <div className="overview-stats-row">
                  <div className="overview-stat-card">
                    <div className="overview-stat-label">Members</div>
                    <div className="overview-stat-value">
                      {group.members_count ?? members.length}
                    </div>
                  </div>

                  <div className="overview-stat-card">
                    <div className="overview-stat-label">Files</div>
                    <div className="overview-stat-value">{filesCount}</div>
                  </div>

                  <div className="overview-stat-card">
                    <div className="overview-stat-label">Tasks</div>
                    <div className="overview-stat-value">{totalTasks}</div>
                  </div>
                </div>

                <p className="overview-text">
                  You have completed {completedCount} out of {totalTasks || 1}{" "}
                  tasks in this group. This is the main dashboard for your study
                  group. We&apos;ll add members, chat, files and tasks here step by
                  step 🚀
                </p>
              </div>
            )}

            {/* MEMBERS */}
            {activeTab === "members" && (
              <div className="two-column-row">
                <div className="card">
                  <div className="card-header-row">
                    <h2 className="card-title">Members</h2>
                    <span className="badge">
                      {members.length}{" "}
                      {members.length === 1 ? "member" : "members"}
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
                          setNewMember((m) => ({
                            ...m,
                            email: e.target.value,
                          }))
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
                          {m.email && (
                            <div className="member-email">{m.email}</div>
                          )}
                        </div>

                        <div className="member-role">
                          {m.role || "Member"}
                        </div>

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
                        No members yet. Add your first member using the form
                        above.
                      </p>
                    )}
                  </ul>
                </div>

                <div className="card">
                  <h3 className="card-title">Invite to this group</h3>
                  <p className="muted-text">
                    Share this code or invite link with your classmates to let
                    them join the group.
                  </p>
                  <div className="invite-box-large">
                    <div className="invite-code-big">
                      {group.invite_code || "———"}
                    </div>
                    <button
                      className="small-pill-btn"
                      onClick={handleCopyInvite}
                    >
                      Copy link
                    </button>
                  </div>
                  <p className="muted-text small">
                    Each new member will appear in the list on the right. You can
                    remove them at any time (admins only).
                  </p>
                </div>
              </div>
            )}

            {/* FILES */}
            {activeTab === "files" && (
              <div className="card">
                <h2 className="card-title">Files</h2>
                <p className="muted-text">
                  Upload lecture notes, screenshots, or any study resources for
                  this group.
                </p>

                <form className="tasks-form" onSubmit={handleFileUpload}>
                  <div className="tasks-form-row">
                    <input
                      type="file"
                      onChange={(e) =>
                        setSelectedFile(e.target.files[0] || null)
                      }
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

            {/* CHAT */}
            {activeTab === "chat" && (
              <div className="card">
                <h2 className="card-title">Group chat</h2>
                <p className="muted-text">
                  Use this simple chat to leave notes and updates for your study
                  group.
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

            {/* TASKS */}
            {activeTab === "tasks" && (
              <div className="card">
                <div className="card-header-row">
                  <h2 className="card-title">Tasks &amp; Assignments</h2>
                  <span className="badge">{totalTasks} tasks</span>
                </div>
                <p className="muted-text">
                  Create tasks for this study group, set due dates, add
                  descriptions, set priority and track progress.
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
                    Overall progress
                    <strong>
                      {" "}
                      {completedCount} / {totalTasks || 1} completed (
                      {progressPercent}
                      %)
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
                            <div className="task-desc">
                              {task.description}
                            </div>
                          )}
                          {task.due_date && (
                            <div className="task-meta">
                              Due: {task.due_date} •{" "}
                              {task.priority || "Normal"}
                            </div>
                          )}
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
          </>
        )}
      </section>
    </div>
  );
}
