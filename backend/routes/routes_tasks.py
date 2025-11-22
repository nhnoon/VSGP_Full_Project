# backend/routes/tasks.py

from flask import Blueprint, request, jsonify
from app import db
from models.task import Task
from datetime import datetime

# Blueprint خاص بالمهام
tasks_bp = Blueprint("tasks", __name__)

# =========================================================
#  GET /groups/<group_id>/tasks
#  إرجاع كل المهام الخاصة بمجموعة معينة
# =========================================================
@tasks_bp.route("/groups/<int:group_id>/tasks", methods=["GET"])
def get_tasks(group_id):
    tasks = (
        Task.query
        .filter_by(group_id=group_id)
        .order_by(Task.created_at.desc())
        .all()
    )

    return jsonify([
        {
            "id": t.id,
            "group_id": t.group_id,
            "title": t.title,
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "is_done": t.is_done,
        }
        for t in tasks
    ])


# =========================================================
#  POST /groups/<group_id>/tasks
#  إضافة مهمة جديدة
# =========================================================
@tasks_bp.route("/groups/<int:group_id>/tasks", methods=["POST"])
def create_task(group_id):
    data = request.get_json() or {}

    title = (data.get("title") or "").strip()
    due_date_str = data.get("due_date")  # "YYYY-MM-DD" لو موجود

    if not title:
        return jsonify({"error": "Title is required"}), 400

    task = Task(
        group_id=group_id,
        title=title,
    )

    if due_date_str:
        try:
            task.due_date = datetime.strptime(due_date_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "Invalid date format, use YYYY-MM-DD"}), 400

    db.session.add(task)
    db.session.commit()

    return jsonify({
        "id": task.id,
        "group_id": task.group_id,
        "title": task.title,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "is_done": task.is_done,
    }), 201


# =========================================================
#  PATCH /groups/<group_id>/tasks/<task_id>
#  تحديث حالة المهمة (مكتملة / غير مكتملة)
# =========================================================
@tasks_bp.route("/groups/<int:group_id>/tasks/<int:task_id>", methods=["PATCH"])
def update_task(group_id, task_id):
    task = Task.query.filter_by(id=task_id, group_id=group_id).first()
    if not task:
        return jsonify({"error": "Task not found"}), 404

    data = request.get_json() or {}

    if "is_done" in data:
        task.is_done = bool(data["is_done"])

    db.session.commit()

    return jsonify({
        "id": task.id,
        "group_id": task.group_id,
        "title": task.title,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "is_done": task.is_done,
    })


# =========================================================
#  DELETE /groups/<group_id>/tasks/<task_id>
#  حذف مهمة
# =========================================================
@tasks_bp.route("/groups/<int:group_id>/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(group_id, task_id):
    task = Task.query.filter_by(id=task_id, group_id=group_id).first()
    if not task:
        return jsonify({"error": "Task not found"}), 404

    db.session.delete(task)
    db.session.commit()

    return jsonify({"message": "Task deleted"})
