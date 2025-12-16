# backend/routes/tasks.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models.task import Task
from models.group import Group
from models.group_member import GroupMember
from models.user import User

tasks_bp = Blueprint("tasks", __name__)


# ------------ Helpers ------------

def get_current_user():
    uid = get_jwt_identity()
    if not uid:
        return None
    return User.query.get(uid)


def user_in_group(user_id, group_id):
    """يتأكد إن المستخدم عضو في القروب"""
    return GroupMember.query.filter_by(
        user_id=user_id, group_id=group_id
    ).first()


# ------------ List tasks ------------

@tasks_bp.route("/<int:group_id>/tasks", methods=["GET"])
@jwt_required()
def list_tasks(group_id):
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    if not user_in_group(user.id, group.id):
        return jsonify({"msg": "You are not a member of this group"}), 403

    tasks = Task.query.filter_by(group_id=group.id).order_by(Task.id.asc()).all()

    result = []
    for t in tasks:
        result.append(
            {
                "id": t.id,
                "group_id": getattr(t, "group_id", group.id),
                "title": getattr(t, "title", ""),
                "description": getattr(t, "description", ""),
                "due_date": getattr(t, "due_date", None),
                "priority": getattr(t, "priority", "Normal"),
                "completed": bool(getattr(t, "completed", False)),
            }
        )

    return jsonify(result), 200


# ------------ Create task ------------

@tasks_bp.route("/<int:group_id>/tasks", methods=["POST"])
@jwt_required()
def create_task(group_id):
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    if not user_in_group(user.id, group.id):
        return jsonify({"msg": "You are not a member of this group"}), 403

    data = request.get_json() or {}

    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    due_date_raw = (data.get("due_date") or "").strip()
    priority_raw = (data.get("priority") or "").strip()

    if not title:
        return jsonify({"msg": "Title is required"}), 400

    # لو التاريخ فاضي نخليه None (مهم لـ PostgreSQL)
    due_date = due_date_raw or None
    priority = priority_raw or "Normal"

    try:
        # ننشئ الكائن بأبسط شيء، وبعدين نضبط الحقول اللي موجودة بالفعل في الموديل
        task = Task()
        if hasattr(task, "group_id"):
            task.group_id = group.id
        if hasattr(task, "title"):
            task.title = title
        if hasattr(task, "description"):
            task.description = description
        if hasattr(task, "due_date"):
            task.due_date = due_date
        if hasattr(task, "priority"):
            task.priority = priority
        if hasattr(task, "completed"):
            task.completed = False

        db.session.add(task)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        # نرجّع الرسالة عشان لو صار خطأ ثاني نقدر نفهمه من الفرونت
        return jsonify({"msg": f"Error creating task: {str(e)}"}), 500

    return (
        jsonify(
            {
                "id": task.id,
                "group_id": getattr(task, "group_id", group.id),
                "title": getattr(task, "title", title),
                "description": getattr(task, "description", description),
                "due_date": getattr(task, "due_date", due_date),
                "priority": getattr(task, "priority", priority),
                "completed": bool(getattr(task, "completed", False)),
            }
        ),
        201,
    )


# ------------ Update task ------------

@tasks_bp.route("/<int:group_id>/tasks/<int:task_id>", methods=["PATCH"])
@jwt_required()
def update_task(group_id, task_id):
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    if not user_in_group(user.id, group.id):
        return jsonify({"msg": "You are not a member of this group"}), 403

    task = Task.query.filter_by(id=task_id).first()
    if not task:
        return jsonify({"msg": "Task not found"}), 404

    data = request.get_json() or {}

    if "completed" in data and hasattr(task, "completed"):
        task.completed = bool(data["completed"])

    if "title" in data and hasattr(task, "title"):
        new_title = (data["title"] or "").strip()
        if new_title:
            task.title = new_title

    if "description" in data and hasattr(task, "description"):
        task.description = (data["description"] or "").strip()

    if "due_date" in data and hasattr(task, "due_date"):
        raw = (data["due_date"] or "").strip()
        task.due_date = raw or None

    if "priority" in data and hasattr(task, "priority"):
        raw = (data["priority"] or "").strip()
        task.priority = raw or task.priority

    db.session.commit()

    return (
        jsonify(
            {
                "id": task.id,
                "group_id": getattr(task, "group_id", group_id),
                "title": getattr(task, "title", ""),
                "description": getattr(task, "description", ""),
                "due_date": getattr(task, "due_date", None),
                "priority": getattr(task, "priority", "Normal"),
                "completed": bool(getattr(task, "completed", False)),
            }
        ),
        200,
    )


# ------------ Delete task ------------

@tasks_bp.route("/<int:group_id>/tasks/<int:task_id>", methods=["DELETE"])
@jwt_required()
def delete_task(group_id, task_id):
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    if not user_in_group(user.id, group.id):
        return jsonify({"msg": "You are not a member of this group"}), 403

    task = Task.query.filter_by(id=task_id).first()
    if not task:
        return jsonify({"msg": "Task not found"}), 404

    db.session.delete(task)
    db.session.commit()

    return jsonify({"msg": "Task deleted"}), 200
