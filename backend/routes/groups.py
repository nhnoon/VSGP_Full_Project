# backend/routes/groups.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models.user import User
from models.group import Group
from models.group_member import GroupMember
from models.file import GroupFile

from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash
import os
import secrets
import string

groups_bp = Blueprint("groups", __name__)


# ------------ Helpers ------------

def generate_invite_code(length: int = 8) -> str:
    """ينشئ كود دعوة عشوائي مثل: PPRQYJKW"""
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def get_current_user():
    uid = get_jwt_identity()
    if not uid:
        return None
    return User.query.get(uid)


def get_membership(user_id: int, group_id: int):
    """يرجع سجل العضوية لو المستخدم عضو في القروب"""
    return GroupMember.query.filter_by(user_id=user_id, group_id=group_id).first()


# ------------ Groups list & create ------------

@groups_bp.route("", methods=["GET"])
@jwt_required()
def list_groups():
    """يعرض كل القروبات اللي المستخدم عضو فيها"""
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    # نستخدم JOIN صريح بدل الاعتماد على relationship
    rows = (
        db.session.query(GroupMember, Group)
        .join(Group, GroupMember.group_id == Group.id)
        .filter(GroupMember.user_id == user.id)
        .all()
    )

    results = []
    for gm, g in rows:
        # نحسب عدد الأعضاء لكل قروب (اختياري)
        members_count = (
            db.session.query(GroupMember)
            .filter_by(group_id=g.id)
            .count()
        )
        results.append(
            {
                "id": g.id,
                "name": g.name,
                "invite_code": g.invite_code,
                "members_count": members_count,
                "role": gm.role or "member",
                "is_owner": bool(
                    (gm.role == "admin") or (getattr(g, "owner_id", None) == user.id)
                ),
            }
        )

    return jsonify(results), 200


@groups_bp.route("", methods=["POST"])
@jwt_required()
def create_group():
    """إنشاء قروب جديد للمستخدم الحالي"""
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"msg": "Group name is required"}), 400

    invite_code = generate_invite_code()

    group = Group(
        name=name,
        invite_code=invite_code,
        owner_id=getattr(user, "id", None),
    )
    db.session.add(group)
    db.session.flush()  # عشان group.id

    gm = GroupMember(
        group_id=group.id,
        user_id=user.id,
        role="admin",
    )
    db.session.add(gm)
    db.session.commit()

    return (
        jsonify(
            {
                "id": group.id,
                "name": group.name,
                "invite_code": group.invite_code,
                "members_count": 1,
                "role": gm.role,
                "is_owner": True,
            }
        ),
        201,
    )


# ------------ Group details ------------

@groups_bp.route("/<int:group_id>", methods=["GET"])
@jwt_required()
def get_group(group_id):
    """تفاصيل قروب واحد"""
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    membership = get_membership(user.id, group.id)
    if not membership:
        return jsonify({"msg": "You are not a member of this group"}), 403

    members_count = GroupMember.query.filter_by(group_id=group.id).count()

    return (
        jsonify(
            {
                "id": group.id,
                "name": group.name,
                "invite_code": group.invite_code,
                "members_count": members_count,
                "is_owner": bool(
                    (membership.role == "admin")
                    or (getattr(group, "owner_id", None) == user.id)
                ),
            }
        ),
        200,
    )


# ------------ Join by invite code ------------

@groups_bp.route("/join", methods=["POST"])
@jwt_required()
def join_group():
    """الانضمام إلى قروب عن طريق كود الدعوة"""
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    data = request.get_json() or {}
    code = (data.get("code") or "").strip().upper()
    if not code:
        return jsonify({"msg": "Invite code is required"}), 400

    group = Group.query.filter_by(invite_code=code).first()
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    existing = get_membership(user.id, group.id)
    if existing:
        return jsonify({"msg": "You are already a member of this group"}), 400

    gm = GroupMember(group_id=group.id, user_id=user.id, role="member")
    db.session.add(gm)
    db.session.commit()

    members_count = GroupMember.query.filter_by(group_id=group.id).count()

    return (
        jsonify(
            {
                "id": group.id,
                "name": group.name,
                "invite_code": group.invite_code,
                "members_count": members_count,
                "role": gm.role,
                "is_owner": False,
            }
        ),
        201,
    )


# ------------ Members ------------

@groups_bp.route("/<int:group_id>/members", methods=["GET"])
@jwt_required()
def list_members(group_id):
    """عرض أعضاء القروب"""
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    membership = get_membership(user.id, group.id)
    if not membership:
        return jsonify({"msg": "You are not a member of this group"}), 403

    # JOIN على User بدل الاعتماد على relationship
    rows = (
        db.session.query(GroupMember, User)
        .join(User, GroupMember.user_id == User.id)
        .filter(GroupMember.group_id == group.id)
        .all()
    )

    results = []
    for gm, u in rows:
        results.append(
            {
                "id": gm.id,  # ID حق العضوية (الفرونت يستخدمه للحذف)
                "name": u.name,
                "email": u.email,
                "role": gm.role or "member",
            }
        )

    return jsonify(results), 200


@groups_bp.route("/<int:group_id>/members", methods=["POST"])
@jwt_required()
def add_member(group_id):
    """إضافة عضو جديد للقروب مع إنشاء User بباسورد عشوائي مشفّر لو احتجنا"""
    current_user = get_current_user()
    if not current_user:
        return jsonify({"msg": "User not found"}), 404

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    current_membership = get_membership(current_user.id, group.id)
    if not current_membership:
        return jsonify({"msg": "You are not a member of this group"}), 403

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()

    if not name:
        return jsonify({"msg": "Name is required"}), 400

    # نبحث عن مستخدم بنفس الإيميل لو موجود
    user = None
    if email:
        user = User.query.filter_by(email=email).first()

    # لو ما وجدناه → ننشئ User جديد بباسورد عشوائي مشفّر
    if not user:
        random_password = secrets.token_hex(8)
        pw_hash = generate_password_hash(random_password)

        user = User(
            name=name,
            email=email or None,
            password_hash=pw_hash,
        )
        db.session.add(user)
        db.session.flush()  # عشان user.id

    # نتأكد أنه مو مضاف من قبل
    already = GroupMember.query.filter_by(group_id=group.id, user_id=user.id).first()
    if already:
        return jsonify({"msg": "Member already in this group"}), 400

    gm = GroupMember(group_id=group.id, user_id=user.id, role="member")
    db.session.add(gm)
    db.session.commit()

    return (
        jsonify(
            {
                "id": gm.id,
                "name": user.name,
                "email": user.email,
                "role": gm.role or "member",
            }
        ),
        201,
    )


@groups_bp.route("/<int:group_id>/members/<int:member_id>", methods=["DELETE"])
@jwt_required()
def remove_member(group_id, member_id):
    """حذف عضوية من القروب"""
    current_user = get_current_user()
    if not current_user:
        return jsonify({"msg": "User not found"}), 404

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    current_membership = get_membership(current_user.id, group.id)
    if not current_membership:
        return jsonify({"msg": "You are not a member of this group"}), 403

    member = GroupMember.query.filter_by(id=member_id, group_id=group.id).first()
    if not member:
        return jsonify({"msg": "Member not found"}), 404

    db.session.delete(member)
    db.session.commit()

    return jsonify({"msg": "Member removed"}), 200


# ------------ Files (read-only حالياً) ------------

@groups_bp.route("/<int:group_id>/files", methods=["GET"])
@jwt_required()
def list_files(group_id):
    """جلب ملفات القروب (لو ما فيه ملفات يرجّع قائمة فاضية)"""
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    membership = get_membership(user.id, group.id)
    if not membership:
        return jsonify({"msg": "You are not a member of this group"}), 403

    files = GroupFile.query.filter_by(group_id=group.id).all()

    results = []
    for f in files:
        results.append(
            {
                "id": f.id,
                "group_id": f.group_id,
                "name": getattr(f, "original_name", None) or getattr(f, "filename", None),
                "filename": getattr(f, "filename", None),
            }
        )

    return jsonify(results), 200
