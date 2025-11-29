# backend/routes/groups.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models.user import User
from models.group import Group
from models.group_member import GroupMember
from models.task import Task
from models.file import GroupFile

groups_bp = Blueprint("groups", __name__)


def get_current_user():
    uid = get_jwt_identity()
    if not uid:
        return None
    return User.query.get(uid)


# ---------- List my groups ----------
@groups_bp.route("/", methods=["GET"])
@jwt_required()
def list_my_groups():
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    memberships = GroupMember.query.filter_by(user_id=user.id).all()

    groups_data = []
    for m in memberships:
        g = m.group
        groups_data.append(
            {
                "id": g.id,
                "name": g.name,
                "invite_code": g.invite_code,
                "role": m.role,
                "is_owner": m.role == "admin" or g.owner_id == user.id,
            }
        )

    return jsonify(groups_data), 200


# ---------- Create new group ----------
@groups_bp.route("/", methods=["POST"])
@jwt_required()
def create_group():
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()

    if not name:
        return jsonify({"msg": "Group name is required"}), 400

    group = Group(name=name, owner_id=user.id)
    db.session.add(group)
    db.session.flush()  # get group.id

    # make creator admin member
    membership = GroupMember(group_id=group.id, user_id=user.id, role="admin")
    db.session.add(membership)
    db.session.commit()

    return (
        jsonify(
            {
                "id": group.id,
                "name": group.name,
                "invite_code": group.invite_code,
                "role": "admin",
                "is_owner": True,
            }
        ),
        201,
    )


# ---------- Group details ----------
@groups_bp.route("/<int:group_id>", methods=["GET"])
@jwt_required()
def get_group(group_id):
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    membership = GroupMember.query.filter_by(
        group_id=group.id, user_id=user.id
    ).first()
    if not membership:
        return jsonify({"msg": "You are not a member of this group"}), 403

    members_count = (
        GroupMember.query.filter_by(group_id=group.id).count()
    )

    return (
        jsonify(
            {
                "id": group.id,
                "name": group.name,
                "invite_code": group.invite_code,
                "members_count": members_count,
                "is_owner": membership.role == "admin"
                or group.owner_id == user.id,
            }
        ),
        200,
    )


# ---------- List members ----------
@groups_bp.route("/<int:group_id>/members", methods=["GET"])
@jwt_required()
def list_members(group_id):
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    memberships = GroupMember.query.filter_by(group_id=group.id).all()
    data = []
    for m in memberships:
        data.append(
            {
                "id": m.user.id,
                "name": m.user.name,
                "email": m.user.email,
                "role": m.role,
            }
        )

    return jsonify(data), 200


# ---------- Add member (simple: name+email only, no invite logic) ----------
@groups_bp.route("/<int:group_id>/members", methods=["POST"])
@jwt_required()
def add_member(group_id):
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    admin_membership = GroupMember.query.filter_by(
        group_id=group.id, user_id=user.id, role="admin"
    ).first()
    if not admin_membership:
        return jsonify({"msg": "Only admins can add members"}), 403

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()

    if not name:
        return jsonify({"msg": "Name is required"}), 400

    # create local phantom user if email not in system (for demo)
    member_user = User.query.filter_by(email=email).first()
    if not member_user:
        member_user = User(name=name, email=email or f"{name}@example.com")
        db.session.add(member_user)
        db.session.flush()

    membership = GroupMember(
        group_id=group.id, user_id=member_user.id, role="member"
    )
    db.session.add(membership)
    db.session.commit()

    return (
        jsonify(
            {
                "id": member_user.id,
                "name": member_user.name,
                "email": member_user.email,
                "role": "member",
            }
        ),
        201,
    )


# ---------- Remove member (admin only) ----------
@groups_bp.route("/<int:group_id>/members/<int:user_id>", methods=["DELETE"])
@jwt_required()
def remove_member(group_id, user_id):
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    admin_membership = GroupMember.query.filter_by(
        group_id=group.id, user_id=user.id, role="admin"
    ).first()
    if not admin_membership:
        return jsonify({"msg": "Only admins can remove members"}), 403

    membership = GroupMember.query.filter_by(
        group_id=group_id, user_id=user_id
    ).first()
    if not membership:
        return jsonify({"msg": "Member not found in this group"}), 404

    db.session.delete(membership)
    db.session.commit()

    return jsonify({"msg": "Member removed"}), 200
