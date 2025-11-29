# backend/routes/groups.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models.user import User
from models.group import Group
from models.group_member import GroupMember

import random
import string

groups_bp = Blueprint("groups", __name__)


def current_user():
    """ارجاع المستخدم الحالي من الـ JWT"""
    user_id = get_jwt_identity()
    if user_id is None:
        return None
    return User.query.get(user_id)


def _generate_invite_code(length: int = 8) -> str:
    """إنشاء كود دعوة فريد للقروب"""
    letters = string.ascii_uppercase
    while True:
        code = "".join(random.choices(letters, k=length))
        if not Group.query.filter_by(invite_code=code).first():
            return code


# -------------------- إنشاء قروب جديد --------------------
@groups_bp.route("/", methods=["POST"])
@jwt_required()
def create_group():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()

    if not name:
        return jsonify({"message": "Group name is required"}), 400

    user = current_user()
    if not user:
        return jsonify({"message": "User not found"}), 404

    # إنشاء القروب وتعيين الـ owner
    group = Group(
        name=name,
        owner_id=user.id,
        invite_code=_generate_invite_code(),
    )
    db.session.add(group)
    db.session.flush()  # عشان ناخذ group.id

    # إضافة صاحب القروب كـ admin في GroupMember
    membership = GroupMember(
        group_id=group.id,
        user_id=user.id,
        role="admin",
    )
    db.session.add(membership)
    db.session.commit()

    return jsonify(
        {
            "id": group.id,
            "name": group.name,
            "role": "admin",
            "invite_code": group.invite_code,
            "is_owner": True,
        }
    ), 201


# -------------------- عرض قروبات المستخدم --------------------
@groups_bp.route("/", methods=["GET"])
@jwt_required()
def list_my_groups():
    user = current_user()
    if not user:
        return jsonify({"message": "User not found"}), 404

    memberships = GroupMember.query.filter_by(user_id=user.id).all()

    groups_data = []
    for m in memberships:
        g = m.group
        groups_data.append(
            {
                "id": g.id,
                "name": g.name,
                "role": m.role,
                "isOwner": g.owner_id == user.id,
            }
        )

    return jsonify(groups_data), 200


# -------------------- تفاصيل قروب واحد --------------------
# (تُستخدم في GroupDashboard.jsx عند /groups/<id>)
@groups_bp.route("/<int:group_id>", methods=["GET"])
@jwt_required()
def get_group(group_id):
    user = current_user()
    if not user:
        return jsonify({"message": "User not found"}), 404

    group = Group.query.get_or_404(group_id)

    membership = GroupMember.query.filter_by(
        group_id=group.id, user_id=user.id
    ).first()
    if not membership:
        return jsonify({"message": "You are not a member of this group"}), 403

    members_count = GroupMember.query.filter_by(group_id=group.id).count()

    return jsonify(
        {
            "id": group.id,
            "name": group.name,
            "invite_code": group.invite_code,
            "members_count": members_count,
            "is_owner": group.owner_id == user.id,
            "role": membership.role,
        }
    ), 200


# -------------------- الانضمام لقروب --------------------
@groups_bp.route("/<int:group_id>/join", methods=["POST"])
@jwt_required()
def join_group(group_id):
    user = current_user()
    if not user:
        return jsonify({"message": "User not found"}), 404

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"message": "Group not found"}), 404

    existing = GroupMember.query.filter_by(
        group_id=group.id, user_id=user.id
    ).first()
    if existing:
        return jsonify({"message": "Already a member"}), 200

    membership = GroupMember(
        group_id=group.id,
        user_id=user.id,
        role="member",
    )
    db.session.add(membership)
    db.session.commit()

    return jsonify({"message": "Joined group successfully"}), 201


# -------------------- عرض الأعضاء داخل القروب --------------------
@groups_bp.route("/<int:group_id>/members", methods=["GET"])
@jwt_required()
def list_members(group_id):
    group = Group.query.get(group_id)
    if not group:
        return jsonify({"message": "Group not found"}), 404

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


# -------------------- طرد عضو (Admin فقط) --------------------
@groups_bp.route("/<int:group_id>/members/<int:user_id>", methods=["DELETE"])
@jwt_required()
def remove_member(group_id, user_id):
    user = current_user()
    if not user:
        return jsonify({"message": "User not found"}), 404

    # تأكد أن اللي يطلب هو Admin في هذا القروب
    admin_membership = GroupMember.query.filter_by(
        group_id=group_id, user_id=user.id, role="admin"
    ).first()

    if not admin_membership:
        return jsonify({"message": "Only admins can remove members"}), 403

    membership = GroupMember.query.filter_by(
        group_id=group_id, user_id=user_id
    ).first()

    if not membership:
        return jsonify({"message": "Member not found in this group"}), 404

    db.session.delete(membership)
    db.session.commit()

    return jsonify({"message": "Member removed"}), 200
