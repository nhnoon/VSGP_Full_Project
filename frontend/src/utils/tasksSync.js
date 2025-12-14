// frontend/src/utils/tasksSync.js
export const TASKS_UPDATED_EVENT = "tasksUpdated";

export function notifyTasksUpdated() {
  window.dispatchEvent(new Event(TASKS_UPDATED_EVENT));
}
