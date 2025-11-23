from flask import Blueprint, request, jsonify, current_app, send_from_directory
from app import db
from models.group import StudyGroup, GroupMember
from models.task import Task
from models.file import GroupFile
import secrets
from datetime import datetime
from werkzeug.utils import secure_filename
from uuid import uuid4
import os

groups_bp = Blueprint("groups", __name__)


# =========================
# Generate invite code
# =========================

def generate_invite_code(length: int = 8) -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    while True:
        code = "".join(secrets.choice(alphabet) for _ in range(length))
        if not StudyGroup.query.filter_by(invite_code=code).first():
            return code


# =========================
# Groups CRUD
# =========================

@groups_bp.get("/")
def get_groups():
    uid = 1
    groups = (
        StudyGroup.query
        .filter_by(owner_id=uid)
        .order_by(StudyGroup.id.desc())
        .all()
    )
    return jsonify([
        {
            "id": g.id,
            "name": g.name,
            "invite_code": g.invite_code,
        }
        for g in groups
    ])


@groups_bp.post("/")
def create_group():
    uid = 1
    data = request.get_json() or {}
    name = data.get("name")

    if not name:
        return jsonify({"msg": "name is required"}), 400

    code = generate_invite_code()
    group = StudyGroup(name=name, owner_id=uid, invite_code=code)
    db.session.add(group)
    db.session.commit()

    return jsonify({
        "id": group.id,
        "name": group.name,
        "invite_code": group.invite_code,
    }), 201


@groups_bp.get("/<int:group_id>")
def get_group(group_id):
    uid = 1
    group = StudyGroup.query.filter_by(id=group_id, owner_id=uid).first()

    if not group:
        return jsonify({"msg": "Group not found"}), 404

    members_count = GroupMember.query.filter_by(group_id=group.id).count()
    tasks_count = Task.query.filter_by(group_id=group.id).count()
    files_count = GroupFile.query.filter_by(group_id=group.id).count()

    return jsonify({
        "id": group.id,
        "name": group.name,
        "owner_id": group.owner_id,
        "invite_code": group.invite_code,
        "members_count": members_count,
        "files_count": files_count,
        "tasks_count": tasks_count,
    })


@groups_bp.delete("/<int:group_id>")
def delete_group(group_id):
    uid = 1
    group = StudyGroup.query.filter_by(id=group_id, owner_id=uid).first()

    if not group:
        return jsonify({"msg": "Group not found"}), 404

    db.session.delete(group)
    db.session.commit()

    return jsonify({"msg": "Group deleted"}), 200


# =========================
# Members
# =========================

@groups_bp.get("/<int:group_id>/members")
def get_members(group_id):
    uid = 1
    group = StudyGroup.query.filter_by(id=group_id, owner_id=uid).first()
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    members = GroupMember.query.filter_by(group_id=group.id).all()
    return jsonify([
        {
            "id": m.id,
            "name": m.name,
            "email": m.email,
            "role": m.role,
            "joined_at": m.joined_at.isoformat() if m.joined_at else None,
        }
        for m in members
    ])


@groups_bp.post("/<int:group_id>/members")
def add_member(group_id):
    uid = 1
    group = StudyGroup.query.filter_by(id=group_id, owner_id=uid).first()

    if not group:
        return jsonify({"msg": "Group not found"}), 404

    data = request.get_json() or {}
    name = data.get("name")
    email = data.get("email")
    role = data.get("role", "member")

    if not name:
        return jsonify({"msg": "name is required"}), 400

    member = GroupMember(
        group_id=group.id,
        name=name,
        email=email,
        role=role,
    )
    db.session.add(member)
    db.session.commit()

    return jsonify({
        "id": member.id,
        "name": member.name,
        "email": member.email,
        "role": member.role,
    }), 201


@groups_bp.delete("/<int:group_id>/members/<int:member_id>")
def delete_member(group_id, member_id):
    uid = 1
    group = StudyGroup.query.filter_by(id=group_id, owner_id=uid).first()

    if not group:
        return jsonify({"msg": "Group not found"}), 404

    member = GroupMember.query.filter_by(id=member_id, group_id=group.id).first()
    if not member:
        return jsonify({"msg": "Member not found"}), 404

    db.session.delete(member)
    db.session.commit()

    return jsonify({"msg": "Member deleted"}), 200


# =========================
# Tasks
# =========================

@groups_bp.get("/<int:group_id>/tasks")
def get_tasks(group_id):
    uid = 1
    group = StudyGroup.query.filter_by(id=group_id, owner_id=uid).first()
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    tasks = Task.query.filter_by(group_id=group.id).order_by(Task.id.desc()).all()

    return jsonify([t.to_dict() for t in tasks])


@groups_bp.post("/<int:group_id>/tasks")
def create_task(group_id):
    uid = 1
    group = StudyGroup.query.filter_by(id=group_id, owner_id=uid).first()

    if not group:
        return jsonify({"msg": "Group not found"}), 404

    data = request.get_json() or {}

    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    priority = (data.get("priority") or "Normal").strip()

    due_date_str = data.get("due_date")
    due_date = None

    if due_date_str:
        try:
            due_date = datetime.strptime(due_date_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"msg": "Invalid date format, use YYYY-MM-DD"}), 400

    if not title:
        return jsonify({"msg": "title is required"}), 400

    task = Task(
        group_id=group.id,
        title=title,
        description=description,
        priority=priority,
        due_date=due_date,
    )

    db.session.add(task)
    db.session.commit()

    return jsonify(task.to_dict()), 201


@groups_bp.patch("/<int:group_id>/tasks/<int:task_id>")
def update_task(group_id, task_id):
    uid = 1
    group = StudyGroup.query.filter_by(id=group_id, owner_id=uid).first()

    if not group:
        return jsonify({"msg": "Group not found"}), 404

    task = Task.query.filter_by(id=task_id, group_id=group.id).first()
    if not task:
        return jsonify({"msg": "Task not found"}), 404

    data = request.get_json() or {}

    if "title" in data:
        task.title = (data["title"] or "").strip() or task.title

    if "description" in data:
        task.description = (data["description"] or "").strip()

    if "priority" in data:
        task.priority = (data["priority"] or "").strip() or task.priority

    if "is_done" in data:
        task.is_done = bool(data["is_done"])

    db.session.commit()

    return jsonify(task.to_dict())


@groups_bp.delete("/<int:group_id>/tasks/<int:task_id>")
def delete_task(group_id, task_id):
    uid = 1
    group = StudyGroup.query.filter_by(id=group_id, owner_id=uid).first()

    if not group:
        return jsonify({"msg": "Group not found"}), 404

    task = Task.query.filter_by(id=task_id, group_id=group.id).first()

    if not task:
        return jsonify({"msg": "Task not found"}), 404

    db.session.delete(task)
    db.session.commit()

    return jsonify({"msg": "Task deleted"}), 200


# =========================
# Files
# =========================

@groups_bp.get("/<int:group_id>/files")
def list_files(group_id):
    uid = 1
    group = StudyGroup.query.filter_by(id=group_id, owner_id=uid).first()
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    files = (
        GroupFile.query
        .filter_by(group_id=group.id)
        .order_by(GroupFile.uploaded_at.desc())
        .all()
    )

    return jsonify([f.to_dict() for f in files])


@groups_bp.post("/<int:group_id>/files")
def upload_file(group_id):
    uid = 1
    group = StudyGroup.query.filter_by(id=group_id, owner_id=uid).first()
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    if "file" not in request.files:
        return jsonify({"msg": "No file part"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"msg": "No selected file"}), 400

    original_name = secure_filename(file.filename)
    if not original_name:
        return jsonify({"msg": "Invalid file name"}), 400

    unique_name = f"{uuid4().hex}_{original_name}"
    upload_folder = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_folder, exist_ok=True)

    file.save(os.path.join(upload_folder, unique_name))

    gf = GroupFile(
        group_id=group.id,
        filename=unique_name,
        original_name=original_name,
    )
    db.session.add(gf)
    db.session.commit()

    return jsonify(gf.to_dict()), 201


@groups_bp.delete("/<int:group_id>/files/<int:file_id>")
def delete_file(group_id, file_id):
    uid = 1
    group = StudyGroup.query.filter_by(id=group_id, owner_id=uid).first()
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    gf = GroupFile.query.filter_by(id=file_id, group_id=group.id).first()
    if not gf:
        return jsonify({"msg": "File not found"}), 404

    file_path = os.path.join(current_app.config["UPLOAD_FOLDER"], gf.filename)
    if os.path.exists(file_path):
        os.remove(file_path)

    db.session.delete(gf)
    db.session.commit()

    return jsonify({"msg": "File deleted"}), 200


@groups_bp.get("/files/<int:file_id>/download")
def download_file(file_id):
    gf = GroupFile.query.get_or_404(file_id)
    upload_folder = current_app.config["UPLOAD_FOLDER"]
    return send_from_directory(
        upload_folder,
        gf.filename,
        as_attachment=True,
        download_name=gf.original_name,
    )


# =========================
# Invite by code
# =========================

@groups_bp.get("/invite/<string:code>")
def get_group_by_invite(code):
    group = StudyGroup.query.filter_by(invite_code=code).first()
    if not group:
        return jsonify({"msg": "Invalid invite code"}), 404

    return jsonify(
        {
            "id": group.id,
            "name": group.name,
            "invite_code": group.invite_code,
        }
    )


@groups_bp.post("/invite/<string:code>/join")
def join_group_by_invite(code):
    group = StudyGroup.query.filter_by(invite_code=code).first()
    if not group:
        return jsonify({"msg": "Invalid invite code"}), 404

    data = request.get_json() or {}
    name = data.get("name")
    email = data.get("email")
    if not name:
        return jsonify({"msg": "name is required"}), 400

    member = GroupMember(
        group_id=group.id,
        name=name,
        email=email,
        role="member",
    )
    db.session.add(member)
    db.session.commit()

    return (
        jsonify(
            {
                "id": member.id,
                "name": member.name,
                "email": member.email,
                "role": member.role,
                "group_id": group.id,
            }
        ),
        201,
    )
