// frontend/src/utils/tasksApi.js
import { authFetch } from "./api";
import { notifyTasksUpdated } from "./tasksSync";

export async function fetchTasks() {
  const res = await authFetch("/tasks", { method: "GET" });
  const data = await res.json().catch(() => []);
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return Array.isArray(data) ? data : [];
}

export async function createTask(payload) {
  const res = await authFetch("/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error("Failed to create task");
  notifyTasksUpdated();
  return data;
}

export async function updateTask(taskId, payload) {
  const res = await authFetch(`/tasks/${taskId}`, {
    method: "PUT", // إذا عندكم PATCH بدليه
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error("Failed to update task");
  notifyTasksUpdated();
  return data;
}

export async function deleteTask(taskId) {
  const res = await authFetch(`/tasks/${taskId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete task");
  notifyTasksUpdated();
  return true;
}
