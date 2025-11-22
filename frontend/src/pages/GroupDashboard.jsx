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

  // Members state
  const [members, setMembers] = useState([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");

  // Tasks state
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");

  // تحميل بيانات القروب + الأعضاء + المهام
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
  }, [id]);

  // تحديث العدادات في Overview لما تتغير الأعضاء أو المهام
  useEffect(() => {
    setGroup((prev) =>
      prev
        ? {
            ...prev,
            members_count: members.length,
            tasks_count: tasks.length,
          }
        : prev
    );
  }, [members, tasks]);

  // نسخ رابط الدعوة
  const copyInviteLink = () => {
    if (!group) return;
    const url = `${window.location.origin}/join/${group.invite_code}`;
    navigator.clipboard
      .writeText(url)
      .then(() => setMsg("Invite link copied to clipboard"))
      .catch(() => setMsg("Could not copy link"));
  };

  // إضافة عضو
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

  // حذف عضو
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

  // إضافة مهمة
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
        due_date: newTaskDue || null,
      };

      const res = await axios.post(`${API_BASE}/groups/${id}/tasks`, payload);
      setTasks((prev) => [res.data, ...prev]);
      setNewTaskTitle("");
      setNewTaskDue("");
      setMsg("Task added");
    } catch (err) {
      console.error(err);
      setMsg("Error adding task");
    }
  };

  // تغيير حالة المهمة (مكتملة / غير)
  const toggleTaskDone = async (task) => {
    try {
      await axios.patch(`${API_BASE}/groups/${id}/tasks/${task.id}`, {
        is_done: !task.is_done,
      });

      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, is_done: !t.is_done } : t
        )
      );
    } catch (err) {
      console.error(err);
      setMsg("Error updating task");
    }
  };

  // حذف مهمة
  const handleDeleteTask = async (taskId) => {
    const ok = window.confirm("Delete this task?");
    if (!ok) return;

    try {
      await axios.delete(`${API_BASE}/groups/${id}/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setMsg("Task deleted");
    } catch (err) {
      console.error(err);
      setMsg("Error deleting task");
    }
  };

  // تبويب Members
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
        {/* الكرت الجانبي للدعوة */}
        <aside className="members-side-card">
          <h3 className="card-title">Invite to this group</h3>
          <p className="muted small">
            Share this code or invite link with your classmates to let them join
            Syno group.
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

        {/* العمود الرئيسي: إضافة الأعضاء + الجدول */}
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

  // تبويب Tasks
  const renderTasksTab = () => (
    <div>
      <div className="members-header">
        <div>
          <h2 className="page-title">Tasks & Assignments</h2>
          <p className="muted">
            Create tasks for this study group, set due dates and track progress.
          </p>
        </div>
        <div className="members-pill">
          {tasks.length} task{tasks.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="tasks-layout">
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
            Due date (optional)
            <input
              type="date"
              className="text-input"
              value={newTaskDue}
              onChange={(e) => setNewTaskDue(e.target.value)}
            />
          </label>
          <button type="submit" className="btn primary">
            Add task
          </button>
        </form>

        <div className="card">
          {tasks.length === 0 ? (
            <p className="empty-text">
              No tasks yet. Add your first task to keep the group on track ✨
            </p>
          ) : (
            <ul className="tasks-list">
              {tasks.map((task) => (
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
                      <div className="task-title">{task.title}</div>
                      {task.due_date && (
                        <div className="task-meta">
                          Due:{" "}
                          <span className="task-due">{task.due_date}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn danger btn-sm"
                    onClick={() => handleDeleteTask(task.id)}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );

  // المحتوى حسب التبويب
  const renderContent = () => {
    if (!group) {
      return <p className="empty-text">Loading group...</p>;
    }

    if (activeTab === "Overview") {
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
              <span className="stat-value">{group.files_count}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Tasks</span>
              <span className="stat-value">
                {group.tasks_count ?? tasks.length}
              </span>
            </div>
          </div>

          <p className="muted" style={{ marginTop: "16px" }}>
            This is the main dashboard for your Syno study group. We&apos;ll add
            members, chat, files and tasks here step by step 🚀
          </p>
        </div>
      );
    }

    if (activeTab === "Members") return renderMembersTab();
    if (activeTab === "Tasks") return renderTasksTab();

    if (activeTab === "Files") {
      return (
        <div>
          <h2 className="page-title">Files</h2>
          <p className="muted">
            Files center is coming soon. You will be able to upload notes, PDFs
            and images for this group.
          </p>
        </div>
      );
    }

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
                "sidebar-tab" + (activeTab === tab ? " sidebar-tab-active" : "")
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
