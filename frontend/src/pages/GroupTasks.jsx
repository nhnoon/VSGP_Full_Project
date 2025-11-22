// GroupTasks.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

function GroupTasks() {
  const { id } = useParams(); 
  const groupId = id;

  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  const API_BASE = "http://localhost:5000/tasks"; // Blueprint prefix

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/group/${groupId}`);
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      console.error("Error:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (groupId) fetchTasks();
  }, [groupId]);

  const addTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    await fetch(`${API_BASE}/group/${groupId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, due_date: dueDate }),
    });

    setTitle("");
    setDueDate("");
    fetchTasks();
  };

  const toggleTask = async (taskId) => {
    await fetch(`${API_BASE}/${taskId}/toggle`, { method: "PATCH" });
    fetchTasks();
  };

  const deleteTask = async (taskId) => {
    await fetch(`${API_BASE}/${taskId}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
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

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-md"
        >
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
                  checked={task.is_completed}
                  onChange={() => toggleTask(task.id)}
                />

                <div>
                  <p
                    className={`${
                      task.is_completed ? "line-through text-gray-400" : ""
                    }`}
                  >
                    {task.title}
                  </p>

                  {task.due_date && (
                    <span className="text-xs text-gray-500">
                      Due: {task.due_date}
                    </span>
                  )}
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
