from flask import Blueprint, request, jsonify
from app import db
from models.group import StudyGroup, GroupMember
from models.task import Task
import secrets

groups_bp = Blueprint("groups", __name__)

# -------------------------
# Generate Invite Code
# -------------------------
def generate_invite_code(length: int = 8) -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    while True:
        code = "".join(secrets.choice(alphabet) for _ in range(length))
        if not StudyGroup.query.filter_by(invite_code=code).first():
            return code


# -------------------------
# Get all groups
# -------------------------
@groups_bp.get("/")
def get_groups():
    uid = 1  # ثابت حالياً
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


# -------------------------
# Create group
# -------------------------
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


# -------------------------
# Get single group
# -------------------------
@groups_bp.get("/<int:group_id>")
def get_group(group_id):
    uid = 1
    group = StudyGroup.query.filter_by(id=group_id, owner_id=uid).first()

    if not group:
        return jsonify({"msg": "Group not found"}), 404

    members_count = GroupMember.query.filter_by(group_id=group.id).count()
    tasks_count = Task.query.filter_by(group_id=group.id).count()

    return jsonify({
        "id": group.id,
        "name": group.name,
        "invite_code": group.invite_code,
        "members_count": members_count,
        "files_count": 0,
        "tasks_count": tasks_count,
    })


# -------------------------
# Delete group
# -------------------------
@groups_bp.delete("/<int:group_id>")
def delete_group(group_id):
    uid = 1
    group = StudyGroup.query.filter_by(id=group_id, owner_id=uid).first()

    if not group:
        return jsonify({"msg": "Group not found"}), 404

    db.session.delete(group)
    db.session.commit()

    return jsonify({"msg": "Group deleted"})


# =========================
#        Members
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

    return jsonify({"msg": "Member deleted"})


# =========================
#     Invite Code
# =========================

@groups_bp.get("/invite/<string:code>")
def get_group_by_invite(code):
    group = StudyGroup.query.filter_by(invite_code=code).first()
    if not group:
        return jsonify({"msg": "Invalid invite code"}), 404

    return jsonify({
        "id": group.id,
        "name": group.name,
        "invite_code": group.invite_code,
    })


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

    return jsonify({
        "id": member.id,
        "name": member.name,
        "email": member.email,
        "role": member.role,
        "group_id": group.id,
    }), 201
