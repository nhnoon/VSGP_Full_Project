// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../utils/api";
import ClockAndTimer from "./ClockAndTimer";
import TimeSpentExact from "../components/TimeSpentExact";
import TaskProgressRing from "../components/TaskProgressRing";
import { TASKS_UPDATED_EVENT } from "../utils/tasksSync";

// نفس ويدجت الكالندر اللي كان عندك
function CalendarWidget({ selectedDay, onSelectDay, eventText = "No events for this day" }) {
  const today = new Date();
  const todayDayNumber = today.getDate();
  const weekdayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const monthName = today.toLocaleDateString("en-US", { month: "long" });
  const year = today.getFullYear();

  const firstDayOfMonth = new Date(year, today.getMonth(), 1).getDay();
  const daysInMonth = new Date(year, today.getMonth() + 1, 0).getDate();

  const daysArray = [];
  for (let i = 0; i < firstDayOfMonth; i++) daysArray.push(null);
  for (let d = 1; d <= daysInMonth; d++) daysArray.push(d);

  const dayNames = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div style={{
      display: "flex",
      alignItems: "stretch",
      gap: 16,
      padding: "16px 20px",
      borderRadius: 18,
      background: "#111111",
      color: "#ffffff",
      maxWidth: 520,
      boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
    }}>
      <div style={{
        minWidth: 72, padding: "10px 12px", borderRadius: 14,
        background: "#1f1f1f", textAlign: "center",
      }}>
        <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#ff453a" }}>
          {weekdayName.toUpperCase()}
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>{todayDayNumber}</div>
        <div style={{ fontSize: 11, marginTop: 4, color: "#aaa" }}>{monthName.toUpperCase()}</div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Up Next</div>
          <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>
            Keep track of your upcoming events and meetings.
          </div>
        </div>

        <div style={{ marginTop: 8, borderRadius: 12, background: "#1b1b1b", padding: "10px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{monthName.toUpperCase()} {year}</span>
          </div>

          <div style={{
            display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2,
            fontSize: 10, color: "#888", marginBottom: 4,
          }}>
            {dayNames.map((d, idx) => (
              <div key={`${d}-${idx}`} style={{ textAlign: "center" }}>{d}</div>
            ))}
          </div>

          <div style={{
            display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, fontSize: 11,
          }}>
            {daysArray.map((d, idx) => {
              if (!d) return <div key={idx} />;
              const isToday = d === todayDayNumber;
              const isSelected = d === selectedDay;

              let bg = "transparent";
              let color = "#ddd";
              if (isSelected) { bg = "#ff453a"; color = "#fff"; }
              else if (isToday) { bg = "#333333"; color = "#fff"; }

              return (
                <div key={idx}
                  onClick={() => onSelectDay && onSelectDay(d)}
                  style={{
                    textAlign: "center", padding: "4px 0", borderRadius: "50%",
                    background: bg, color, cursor: "pointer",
                  }}
                >
                  {d}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 10, fontSize: 13, color: "#ddd" }}>
          {eventText || "No events for this day"}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [myGroups, setMyGroups] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [sessions, setSessions] = useState([]);

  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [eventsByDay, setEventsByDay] = useState({});
  const [eventInput, setEventInput] = useState("");

  const safeGroups = useMemo(() => (Array.isArray(myGroups) ? myGroups : []), [myGroups]);
  const safeTasks = useMemo(() => (Array.isArray(tasks) ? tasks : []), [tasks]);
  const safeSessions = useMemo(() => (Array.isArray(sessions) ? sessions : []), [sessions]);

  // ✅ هذا نستخدمه للتحديث الفوري لدائرة التاسكات
  const loadTasksOnly = async () => {
    try {
      const tRes = await authFetch("/tasks", { method: "GET" });
      const tData = await tRes.json().catch(() => []);
      if (tRes.ok) setTasks(Array.isArray(tData) ? tData : []);
    } catch {}
  };

  useEffect(() => {
    const token = localStorage.getItem("vsgp_token");
    if (!token) {
      navigate("/login");
      return;
    }

    const load = async () => {
      try {
        // groups (joined only)
        const gRes = await authFetch("/groups", { method: "GET" });
        const gData = await gRes.json().catch(() => []);
        const list = Array.isArray(gData) ? gData : [];
        setMyGroups(list.filter((g) => !!g.is_member));

        // tasks
        await loadTasksOnly();

        // study sessions
        try {
          const sRes = await authFetch("/study_sessions", { method: "GET" });
          const sData = await sRes.json().catch(() => []);
          if (sRes.ok) setSessions(Array.isArray(sData) ? sData : []);
        } catch {}
      } catch (e) {
        console.error(e);
      }
    };

    load();
  }, [navigate]);

  // ✅ Listener: إذا أي صفحة عدلت tasks → يحدث الداشبورد فورًا
  useEffect(() => {
    const onTasksUpdated = () => {
      loadTasksOnly();
    };
    window.addEventListener(TASKS_UPDATED_EVENT, onTasksUpdated);
    return () => window.removeEventListener(TASKS_UPDATED_EVENT, onTasksUpdated);
  }, []);

  const handleSelectDay = (day) => {
    setSelectedDay(day);
    setEventInput(eventsByDay[day] || "");
  };

  const handleSaveEvent = (e) => {
    e.preventDefault();
    const trimmed = eventInput.trim();
    setEventsByDay((prev) => ({ ...prev, [selectedDay]: trimmed }));
  };

  const currentEventText =
    eventsByDay[selectedDay] && eventsByDay[selectedDay].length > 0
      ? eventsByDay[selectedDay]
      : "No events for this day";

  // ✅ إحصائيات
  const totalGroups = safeGroups.length;
  const totalTasks = safeTasks.length;
  const doneTasks = safeTasks.filter((t) => t.status === "done" || t.completed === true).length;
  const progress = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

  // (مو ضروري هنا، بس مخليه لو تحتاجينه لاحقًا)
  const totalMinutes = safeSessions.reduce((sum, s) => sum + (Number(s.duration_minutes) || 0), 0);

  return (
    <div>
      <h1 style={{ marginBottom: 6 }}>Dashboard</h1>
      <p style={{ marginTop: 0, color: "#6b7280" }}>
        Your personal overview and quick access to groups.
      </p>

      {/* Top widgets (Calendar + Timer) */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 14 }}>
        <CalendarWidget selectedDay={selectedDay} onSelectDay={handleSelectDay} eventText={currentEventText} />
        <ClockAndTimer />
      </div>

      {/* Event input */}
      <form
        onSubmit={handleSaveEvent}
        style={{
          marginTop: 12,
          display: "flex",
          gap: 8,
          maxWidth: 520,
        }}
      >
        <input
          type="text"
          value={eventInput}
          onChange={(e) => setEventInput(e.target.value)}
          placeholder={`Add event for day ${selectedDay} (e.g. Quiz at 3 PM)`}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            fontSize: 14,
          }}
        />
        <button
          type="submit"
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "none",
            background: "#2563eb",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Save
        </button>
      </form>

      {/* Stats cards */}
      <div style={{
        marginTop: 18,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 14,
      }}>
        {/* Groups */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 8px 22px rgba(0,0,0,0.06)" }}>
          <div style={{ color: "#6b7280", fontSize: 13 }}>Groups</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{totalGroups}</div>
          <div style={{ color: "#6b7280", fontSize: 12 }}>Joined groups</div>
        </div>

        {/* Tasks ring */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 8px 22px rgba(0,0,0,0.06)" }}>
          <TaskProgressRing
            value={progress}
            labelTop="Tasks"
            centerText={`${doneTasks}/${totalTasks}`}
            subText="Completed tasks"
          />
        </div>

        {/* Progress bar */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 8px 22px rgba(0,0,0,0.06)" }}>
          <div style={{ color: "#6b7280", fontSize: 13 }}>Progress</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{progress}%</div>
          <div style={{ height: 10, background: "#e5e7eb", borderRadius: 999, marginTop: 10 }}>
            <div style={{ width: `${progress}%`, height: "100%", background: "#2563eb", borderRadius: 999 }} />
          </div>
        </div>

        {/* Time Spent */}
        <TimeSpentExact />
      </div>

      {/* Quick groups */}
      <div style={{ marginTop: 18, background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 8px 22px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Your groups</h3>
          <button
            onClick={() => navigate("/groups")}
            style={{ border: "none", background: "#111827", color: "#fff", padding: "8px 12px", borderRadius: 10, cursor: "pointer" }}
          >
            Go to groups
          </button>
        </div>
        <ul style={{ marginTop: 10 }}>
          {safeGroups.slice(0, 5).map((g) => (
            <li key={g.id}>
              {g.name} <span style={{ color: "#6b7280" }}>({g.role || "member"})</span>
            </li>
          ))}
          {safeGroups.length === 0 && <li style={{ color: "#6b7280" }}>No joined groups yet.</li>}
        </ul>
      </div>
    </div>
  );
}
