// frontend/src/pages/GroupDashboard.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = "http://localhost:5000";
const TABS = ["Overview", "Members", "Files", "Chat", "Tasks"];

export default function GroupDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [msg, setMsg] = useState("");

  // ===== Members state =====
  const [members, setMembers] = useState([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");

  // ===== Tasks state =====
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("Normal");

  const [taskFilter, setTaskFilter] = useState("all"); // all | pending | completed | high

  // ===== Edit task state =====
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("Normal");

  // ===== Files state =====
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // تحميل بيانات القروب + الأعضاء + المهام + الملفات
  useEffect(() => {
    setMsg("");

    axios
      .get(`${API_BASE}/groups/${id}`)
      .then((res) => setGroup(res.data))
      .catch((err) => {
        console.error(err);
        setMsg("Group not found or error loading group");
      });

    axios
      .get(`${API_BASE}/groups/${id}/members`)
      .then((res) => setMembers(res.data))
      .catch((err) => console.error(err));

    axios
      .get(`${API_BASE}/groups/${id}/tasks`)
      .then((res) => setTasks(res.data))
      .catch((err) => console.error(err));

    axios
      .get(`${API_BASE}/groups/${id}/files`)
      .then((res) => setFiles(res.data))
      .catch((err) => console.error(err));
  }, [id]);

  // تحديث العدادات في Overview لما تتغير الأعضاء أو المهام أو الملفات
  useEffect(() => {
    setGroup((prev) =>
      prev
        ? {
            ...prev,
            members_count: members.length,
            tasks_count: tasks.length,
            files_count: files.length,
          }
        : prev
    );
  }, [members, tasks, files]);

  // نسخ رابط الدعوة
  const copyInviteLink = () => {
    if (!group) return;
    const url = `${window.location.origin}/join/${group.invite_code}`;
    navigator.clipboard
      .writeText(url)
      .then(() => setMsg("Invite link copied to clipboard"))
      .catch(() => setMsg("Could not copy link"));
  };

  // ===================== Members logic =====================

  const handleAddMember = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!newMemberName.trim()) {
      setMsg("Please enter member name");
      return;
    }

    try {
      const res = await axios.post(`${API_BASE}/groups/${id}/members`, {
        name: newMemberName.trim(),
        email: newMemberEmail.trim() || null,
      });

      setMembers((prev) => [...prev, res.data]);
      setNewMemberName("");
      setNewMemberEmail("");
      setMsg("Member added");
    } catch (err) {
      console.error(err);
      setMsg("Error adding member");
    }
  };

  const handleDeleteMember = async (memberId) => {
    const ok = window.confirm("Remove this member?");
    if (!ok) return;

    try {
      await axios.delete(`${API_BASE}/groups/${id}/members/${memberId}`);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setMsg("Member removed");
    } catch (err) {
      console.error(err);
      setMsg("Error deleting member");
    }
  };

  // ===================== Tasks logic =====================

  const handleAddTask = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!newTaskTitle.trim()) {
      setMsg("Please enter task title");
      return;
    }

    try {
      const payload = {
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim(),
        due_date: newTaskDue || null,
        priority: newTaskPriority || "Normal",
      };

      const res = await axios.post(`${API_BASE}/groups/${id}/tasks`, payload);
      setTasks((prev) => [res.data, ...prev]);
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskDue("");
      setNewTaskPriority("Normal");
      setMsg("Task added");
    } catch (err) {
      console.error(err);
      setMsg("Error adding task");
    }
  };

  const toggleTaskDone = async (task) => {
    try {
      const res = await axios.patch(
        `${API_BASE}/groups/${id}/tasks/${task.id}`,
        {
          is_done: !task.is_done,
        }
      );

      const updated = res.data;

      setTasks((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t))
      );
    } catch (err) {
      console.error(err);
      setMsg("Error updating task");
    }
  };

  const handleDeleteTask = async (taskId) => {
    const ok = window.confirm("Delete this task?");
    if (!ok) return;

    try {
      await axios.delete(`${API_BASE}/groups/${id}/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setMsg("Task deleted");

      if (editingTaskId === taskId) {
        cancelEditTask();
      }
    } catch (err) {
      console.error(err);
      setMsg("Error deleting task");
    }
  };

  // ===== إحصائيات المهام و الفلترة =====

  const totalTasks = tasks.length;
  const completedCount = tasks.filter((t) => t.is_done).length;
  const pendingCount = totalTasks - completedCount;
  const highCount = tasks.filter(
    (t) => (t.priority || "").toLowerCase() === "high"
  ).length;
  const progressPercent = totalTasks
    ? Math.round((completedCount / totalTasks) * 100)
    : 0;

  const filteredTasks = tasks.filter((task) => {
    if (taskFilter === "pending") return !task.is_done;
    if (taskFilter === "completed") return task.is_done;
    if (taskFilter === "high")
      return (task.priority || "").toLowerCase() === "high";
    return true; // all
  });

  const priorityClass = (priority) => {
    const p = (priority || "").toLowerCase();
    if (p === "high") return "priority-pill priority-high";
    if (p === "low") return "priority-pill priority-low";
    return "priority-pill priority-normal";
  };

  // ===== Edit task logic =====

  const startEditTask = (task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title || "");
    setEditDescription(task.description || "");
    setEditPriority(task.priority || "Normal");
  };

  const cancelEditTask = () => {
    setEditingTaskId(null);
    setEditTitle("");
    setEditDescription("");
    setEditPriority("Normal");
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!editingTaskId) return;

    if (!editTitle.trim()) {
      setMsg("Please enter task title");
      return;
    }

    try {
      const payload = {
        title: editTitle.trim(),
        description: editDescription.trim(),
        priority: editPriority || "Normal",
      };

      const res = await axios.patch(
        `${API_BASE}/groups/${id}/tasks/${editingTaskId}`,
        payload
      );

      const updated = res.data;

      setTasks((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t))
      );

      cancelEditTask();
      setMsg("Task updated");
    } catch (err) {
      console.error(err);
      setMsg("Error updating task");
    }
  };

  // ===================== Files logic =====================

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    setSelectedFile(file || null);
  };

  const handleUploadFile = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!selectedFile) {
      setMsg("Please choose a file");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await axios.post(
        `${API_BASE}/groups/${id}/files`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setFiles((prev) => [res.data, ...prev]);
      setSelectedFile(null);
      if (e.target && e.target.reset) {
        e.target.reset();
      }
      setMsg("File uploaded");
    } catch (err) {
      console.error(err);
      setMsg("Error uploading file");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId) => {
    const ok = window.confirm("Delete this file?");
    if (!ok) return;

    try {
      await axios.delete(`${API_BASE}/groups/${id}/files/${fileId}`);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      setMsg("File deleted");
    } catch (err) {
      console.error(err);
      setMsg("Error deleting file");
    }
  };

  // ===================== Tabs UI =====================

  const renderMembersTab = () => (
    <div>
      <div className="members-header">
        <div>
          <h2 className="page-title">Members</h2>
          <p className="muted">
            Manage your study group members, invite new students and keep the
            group organized.
          </p>
        </div>
        <div className="members-pill">
          {members.length} member{members.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="members-layout">
        <aside className="members-side-card">
          <h3 className="card-title">Invite to this group</h3>
          <p className="muted small">
            Share this code or invite link with your classmates to let them join
            the group.
          </p>

          <div className="invite-card">
            <div>
              <div className="stat-label">Invite code</div>
              <div className="invite-code">{group?.invite_code}</div>
            </div>
            <button
              type="button"
              className="btn secondary"
              onClick={copyInviteLink}
            >
              Copy link
            </button>
          </div>

          <div className="members-hint">
            <span className="hint-dot" />
            <span className="muted small">
              Each new member will appear in the list on the right. You can
              remove them at any time.
            </span>
          </div>
        </aside>

        <section className="members-main">
          <form
            onSubmit={handleAddMember}
            className="card form-card members-form"
          >
            <label className="field-label">
              Name
              <input
                className="text-input"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Student name"
              />
            </label>
            <label className="field-label">
              Email (optional)
              <input
                className="text-input"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="student@example.com"
              />
            </label>
            <button type="submit" className="btn primary">
              Add member
            </button>
          </form>

          <div className="card">
            {members.length === 0 ? (
              <p className="empty-text">
                No members yet. Start by adding your first member ✨
              </p>
            ) : (
              <table className="members-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th style={{ width: "120px" }}>Role</th>
                    <th style={{ width: "120px" }} />
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td>{m.name}</td>
                      <td>{m.email || "—"}</td>
                      <td>
                        <span className="role-pill">
                          {m.role === "owner" ? "Owner" : "Member"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn danger"
                          onClick={() => handleDeleteMember(m.id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );

  const renderTasksTab = () => (
    <div>
      <div className="members-header">
        <div>
          <h2 className="page-title">Tasks & Assignments</h2>
          <p className="muted">
            Create tasks for this study group, set due dates, add descriptions,
            set priority and track progress.
          </p>
        </div>
        <div className="members-pill">
          {tasks.length} task{tasks.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="tasks-layout">
        {/* Form إضافة المهام */}
        <form onSubmit={handleAddTask} className="card form-card tasks-form">
          <label className="field-label">
            Title
            <input
              className="text-input"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="e.g. Chapter 3 summary"
            />
          </label>

          <label className="field-label">
            Description (optional)
            <textarea
              className="text-input"
              rows={2}
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              placeholder="Details about this task..."
            />
          </label>

          <label className="field-label">
            Due date (optional)
            <input
              type="date"
              className="text-input"
              value={newTaskDue}
              onChange={(e) => setNewTaskDue(e.target.value)}
            />
          </label>

          <label className="field-label">
            Priority
            <select
              className="text-input"
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value)}
            >
              <option value="High">High</option>
              <option value="Normal">Normal</option>
              <option value="Low">Low</option>
            </select>
          </label>

          <button type="submit" className="btn primary">
            Add task
          </button>
        </form>

        {/* Summary + Filters */}
        <div className="card" style={{ marginTop: 16, marginBottom: 16 }}>
          <div className="task-summary-header">
            <div>
              <div className="muted small">Overall progress</div>
              <div className="task-summary-numbers">
                {completedCount} / {totalTasks} completed ({progressPercent}%)
              </div>
            </div>
          </div>

          <div className="progress-bar">
            <div
              className="progress-bar-inner"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="task-summary-stats">
            <span className="muted small">
              Pending: <strong>{pendingCount}</strong>
            </span>
            <span className="muted small">
              Completed: <strong>{completedCount}</strong>
            </span>
            <span className="muted small">
              High priority: <strong>{highCount}</strong>
            </span>
          </div>

          <div className="task-filters">
            <span className="muted small" style={{ marginRight: 8 }}>
              Filter:
            </span>
            <button
              type="button"
              className={
                "filter-pill" +
                (taskFilter === "all" ? " filter-pill-active" : "")
              }
              onClick={() => setTaskFilter("all")}
            >
              All
            </button>
            <button
              type="button"
              className={
                "filter-pill" +
                (taskFilter === "pending" ? " filter-pill-active" : "")
              }
              onClick={() => setTaskFilter("pending")}
            >
              Pending
            </button>
            <button
              type="button"
              className={
                "filter-pill" +
                (taskFilter === "completed" ? " filter-pill-active" : "")
              }
              onClick={() => setTaskFilter("completed")}
            >
              Completed
            </button>
            <button
              type="button"
              className={
                "filter-pill" +
                (taskFilter === "high" ? " filter-pill-active" : "")
              }
              onClick={() => setTaskFilter("high")}
            >
              High priority
            </button>
          </div>
        </div>

        {/* Edit form لو فيه مهمة تحت التعديل */}
        {editingTaskId && (
          <form
            onSubmit={handleUpdateTask}
            className="card form-card tasks-form"
            style={{ marginBottom: 16 }}
          >
            <h3 className="card-title">Edit task</h3>

            <label className="field-label">
              Title
              <input
                className="text-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </label>

            <label className="field-label">
              Description
              <textarea
                className="text-input"
                rows={2}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </label>

            <label className="field-label">
              Priority
              <select
                className="text-input"
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value)}
              >
                <option value="High">High</option>
                <option value="Normal">Normal</option>
                <option value="Low">Low</option>
              </select>
            </label>

            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="btn primary">
                Save changes
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={cancelEditTask}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* قائمة المهام */}
        <div className="card">
          {filteredTasks.length === 0 ? (
            <p className="empty-text">
              No tasks for this filter. Try adding a new task ✨
            </p>
          ) : (
            <ul className="tasks-list">
              {filteredTasks.map((task) => (
                <li
                  key={task.id}
                  className={
                    "task-item" + (task.is_done ? " task-item-done" : "")
                  }
                >
                  <div className="task-main">
                    <label className="task-check">
                      <input
                        type="checkbox"
                        checked={task.is_done}
                        onChange={() => toggleTaskDone(task)}
                      />
                      <span className="custom-checkbox" />
                    </label>
                    <div className="task-text">
                      <div className="task-title-row">
                        <span className="task-title">{task.title}</span>
                        <span className={priorityClass(task.priority)}>
                          {task.priority || "Normal"}
                        </span>
                      </div>
                      {task.description && (
                        <div className="task-description">
                          {task.description}
                        </div>
                      )}
                      <div className="task-meta">
                        {task.due_date && (
                          <>
                            Due:{" "}
                            <span className="task-due">{task.due_date}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="task-actions">
                    <button
                      type="button"
                      className="btn secondary btn-sm"
                      onClick={() => startEditTask(task)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn danger btn-sm"
                      onClick={() => handleDeleteTask(task.id)}
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
    </div>
  );

  const renderFilesTab = () => (
    <div>
      <div className="members-header">
        <div>
          <h2 className="page-title">Group Files</h2>
          <p className="muted">
            Upload PDFs, images or documents for this study group and share them
            with your members.
          </p>
        </div>
        <div className="members-pill">
          {files.length} file{files.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="tasks-layout">
        <form
          onSubmit={handleUploadFile}
          className="card form-card tasks-form"
        >
          <label className="field-label">
            Choose file
            <input type="file" className="text-input" onChange={handleFileChange} />
          </label>
          <button type="submit" className="btn primary" disabled={uploading}>
            {uploading ? "Uploading..." : "Upload file"}
          </button>
        </form>

        <div className="card">
          {files.length === 0 ? (
            <p className="empty-text">
              No files yet. Upload your first file for this group ✨
            </p>
          ) : (
            <table className="members-table">
              <thead>
                <tr>
                  <th>File name</th>
                  <th style={{ width: "180px" }}>Uploaded at</th>
                  <th style={{ width: "140px" }} />
                </tr>
              </thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <a
                        href={`${API_BASE}${f.download_url}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {f.original_name}
                      </a>
                    </td>
                    <td>
                      <span className="muted small">
                        {f.uploaded_at
                          ? new Date(f.uploaded_at).toLocaleString()
                          : "—"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="btn danger btn-sm"
                        onClick={() => handleDeleteFile(f.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );

  // اختيار المحتوى حسب التبويب
  const renderContent = () => {
    if (!group) {
      return <p className="empty-text">Loading group...</p>;
    }

    if (activeTab === "Overview") {
      const total = tasks.length;
      const done = tasks.filter((t) => t.is_done).length;

      return (
        <div>
          <h2 className="page-title">{group.name}</h2>
          <p className="muted">Group ID: {group.id}</p>

          <div className="invite-card">
            <div>
              <div className="stat-label">Invite code</div>
              <div className="invite-code">{group.invite_code}</div>
            </div>
            <button
              type="button"
              className="btn secondary"
              onClick={copyInviteLink}
            >
              Copy invite link
            </button>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Members</span>
              <span className="stat-value">
                {group.members_count ?? members.length}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Files</span>
              <span className="stat-value">
                {group.files_count ?? files.length}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Tasks</span>
              <span className="stat-value">
                {group.tasks_count ?? total}
              </span>
            </div>
          </div>

          {total > 0 && (
            <p className="muted" style={{ marginTop: "12px" }}>
              You have completed {done} out of {total} tasks in this group.
            </p>
          )}

          <p className="muted" style={{ marginTop: "16px" }}>
            This is the main dashboard for your study group. We&apos;ll add
            members, chat, files and tasks here step by step 🚀
          </p>
        </div>
      );
    }

    if (activeTab === "Members") return renderMembersTab();
    if (activeTab === "Tasks") return renderTasksTab();
    if (activeTab === "Files") return renderFilesTab();

    if (activeTab === "Chat") {
      return (
        <div>
          <h2 className="page-title">Group Chat</h2>
          <p className="muted">
            Chat feature is coming soon. Students will discuss and study
            together here.
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <button
          className="sidebar-back"
          onClick={() => navigate("/")}
          type="button"
        >
          ← All groups
        </button>

        <div className="sidebar-title">
          <span className="sidebar-label">Group</span>
          <span className="sidebar-name">{group?.name || "Loading..."}</span>
        </div>

        <nav className="sidebar-nav">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={
                "sidebar-tab" +
                (activeTab === tab ? " sidebar-tab-active" : "")
              }
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>
      </aside>

      <section className="dashboard-main">
        {msg && <p className="status-msg">{msg}</p>}
        <div className="card">{renderContent()}</div>
      </section>
    </div>
  );
}
