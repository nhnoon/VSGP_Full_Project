import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { notifyTasksUpdated } from "../utils/tasksSync";

function GroupTasks() {
  const { id } = useParams();
  const groupId = id;

  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  const API_BASE = "http://localhost:5000/tasks"; // نفس اللي كان عندك

  const fetchTasks = async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/group/${groupId}`);
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error:", err);
      setTasks([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const addTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await fetch(`${API_BASE}/group/${groupId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, due_date: dueDate || null }),
      });

      setTitle("");
      setDueDate("");
      await fetchTasks();

      // ✅ يحدث دائرة التاسكات في الداشبورد فورًا
      notifyTasksUpdated();
    } catch (err) {
      console.error("Add task error:", err);
    }
  };

  const toggleTask = async (taskId) => {
    try {
      await fetch(`${API_BASE}/${taskId}/toggle`, { method: "PATCH" });
      await fetchTasks();
      notifyTasksUpdated();
    } catch (err) {
      console.error("Toggle task error:", err);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await fetch(`${API_BASE}/${taskId}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      notifyTasksUpdated();
    } catch (err) {
      console.error("Delete task error:", err);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md mt-4">
      <h2 className="text-lg font-bold mb-4">Tasks & Assignments</h2>

      <form onSubmit={addTask} className="flex flex-col md:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Task title..."
          className="border p-2 rounded w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          type="date"
          className="border p-2 rounded"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md">
          Add
        </button>
      </form>

      {loading ? (
        <p>Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <p className="text-gray-500">No tasks yet.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex justify-between items-center bg-gray-100 p-3 rounded"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={!!task.is_completed}
                  onChange={() => toggleTask(task.id)}
                />

                <div>
                  <p className={`${task.is_completed ? "line-through text-gray-400" : ""}`}>
                    {task.title}
                  </p>

                  {task.due_date ? (
                    <span className="text-xs text-gray-500">
                      Due: {task.due_date}
                    </span>
                  ) : null}
                </div>
              </div>

              <button
                className="text-red-500 text-sm"
                onClick={() => deleteTask(task.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default GroupTasks;