# backend/routes/tasks.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models.task import Task
from models.group import Group
from models.group_member import GroupMember
from models.user import User

tasks_bp = Blueprint("tasks", __name__)


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
    

# ---------- جلب كل التاسكات في القروب ----------
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

    return jsonify([
        {
            "id": t.id,
            "group_id": t.group_id,
            "title": t.title,
            "description": t.description,
            "due_date": t.due_date,
            "priority": t.priority,
            "completed": t.completed,
        }
        for t in tasks
    ]), 200


# ---------- إضافة تاسك جديد ----------
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
    due_date = (data.get("due_date") or "").strip()
    priority = (data.get("priority") or "Normal").strip() or "Normal"

    if not title:
        return jsonify({"msg": "Title is required"}), 400

    task = Task(
        group_id=group.id,
        title=title,
        description=description,
        due_date=due_date,
        priority=priority,
        completed=False,
    )
    db.session.add(task)
    db.session.commit()

    return jsonify({
        "id": task.id,
        "group_id": task.group_id,
        "title": task.title,
        "description": task.description,
        "due_date": task.due_date,
        "priority": task.priority,
        "completed": task.completed,
    }), 201


# ---------- تعديل حالة التاسك (مكتمل / غير مكتمل) أو أي حقل ----------
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

    task = Task.query.filter_by(id=task_id, group_id=group.id).first()
    if not task:
        return jsonify({"msg": "Task not found"}), 404

    data = request.get_json() or {}

    if "completed" in data:
        task.completed = bool(data["completed"])
    if "title" in data:
        task.title = (data["title"] or "").strip() or task.title
    if "description" in data:
        task.description = (data["description"] or "").strip()
    if "due_date" in data:
        task.due_date = (data["due_date"] or "").strip()
    if "priority" in data:
        task.priority = (data["priority"] or "").strip() or task.priority

    db.session.commit()

    return jsonify({
        "id": task.id,
        "group_id": task.group_id,
        "title": task.title,
        "description": task.description,
        "due_date": task.due_date,
        "priority": task.priority,
        "completed": task.completed,
    }), 200


# ---------- حذف تاسك ----------
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

    task = Task.query.filter_by(id=task_id, group_id=group.id).first()
    if not task:
        return jsonify({"msg": "Task not found"}), 404

    db.session.delete(task)
    db.session.commit()

    return jsonify({"msg": "Task deleted"}), 200