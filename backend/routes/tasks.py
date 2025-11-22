# backend/routes/tasks.py
from flask import Blueprint, request, jsonify
from app import db
from models.task import Task
from datetime import datetime

tasks_bp = Blueprint("tasks", __name__)


# GET /groups/<group_id>/tasks
@tasks_bp.route("/groups/<int:group_id>/tasks", methods=["GET"])
def get_tasks(group_id):
    tasks = (
        Task.query
        .filter_by(group_id=group_id)
        .order_by(Task.created_at.desc())
        .all()
    )

    return jsonify([t.to_dict() for t in tasks])


# POST /groups/<group_id>/tasks
@tasks_bp.route("/groups/<int:group_id>/tasks", methods=["POST"])
def create_task(group_id):
    data = request.get_json() or {}

    title = (data.get("title") or "").strip()
    due_date_str = data.get("due_date")

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

    return jsonify(task.to_dict()), 201


# PATCH /groups/<group_id>/tasks/<task_id>
@tasks_bp.route("/groups/<int:group_id>/tasks/<int:task_id>", methods=["PATCH"])
def update_task(group_id, task_id):
    task = Task.query.filter_by(id=task_id, group_id=group_id).first()
    if not task:
        return jsonify({"error": "Task not found"}), 404

    data = request.get_json() or {}
    if "is_done" in data:
        task.is_done = bool(data["is_done"])

    db.session.commit()
    return jsonify(task.to_dict())


# DELETE /groups/<group_id>/tasks/<task_id>
@tasks_bp.route("/groups/<int:group_id>/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(group_id, task_id):
    task = Task.query.filter_by(id=task_id, group_id=group_id).first()
    if not task:
        return jsonify({"error": "Task not found"}), 404

    db.session.delete(task)
    db.session.commit()

    return jsonify({"message": "Task deleted"})
