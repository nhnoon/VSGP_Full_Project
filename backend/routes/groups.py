from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models.user import User
from models.group import Group
from models.group_member import GroupMember
from models.file import GroupFile
from models.join_request import GroupJoinRequest

from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash
import os
import secrets
import string
from datetime import datetime

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


def is_owner_or_admin(user_id: int, group: Group):
    """يتأكد إن المستخدم مالك القروب أو أدمن"""
    gm = GroupMember.query.filter_by(user_id=user_id, group_id=group.id).first()
    if not gm:
        return False
    if gm.role == "admin":
        return True
    if getattr(group, "owner_id", None) == user_id:
        return True
    return False


# ------------ Groups list & create ------------

@groups_bp.route("", methods=["GET"])
@jwt_required()
def list_groups():
    """يرجع فقط القروبات اللي المستخدم الحالي عضو فيها (Your groups)"""
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    rows = (
        db.session.query(Group, GroupMember)
        .join(GroupMember, GroupMember.group_id == Group.id)
        .filter(GroupMember.user_id == user.id)
        .order_by(Group.id.asc())
        .all()
    )

    results = []
    for g, gm in rows:
        members_count = GroupMember.query.filter_by(group_id=g.id).count()

        results.append({
            "id": g.id,
            "name": g.name,
            "invite_code": g.invite_code,
            "members_count": members_count,
            "is_member": True,
            "role": gm.role,
            "is_owner": bool(gm.role == "admin" or getattr(g, "owner_id", None) == user.id),
        })

    return jsonify(results), 200

@groups_bp.route("/explore", methods=["GET"])
@jwt_required()
def explore_groups():
    """يعرض جميع القروبات + حالة طلب الانضمام للمستخدم الحالي"""
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    groups = Group.query.all()
    results = []

    for g in groups:
        membership = get_membership(user.id, g.id)
        members_count = GroupMember.query.filter_by(group_id=g.id).count()

        jr = GroupJoinRequest.query.filter_by(group_id=g.id, user_id=user.id).first()
        jr_status = jr.status if jr else "none"  # none/pending/approved/rejected

        results.append({
            "id": g.id,
            "name": g.name,
            "invite_code": g.invite_code,
            "members_count": members_count,
            "is_member": bool(membership),
            "role": membership.role if membership else None,
            "join_request_status": jr_status,
        })

    return jsonify(results), 200


@groups_bp.route("", methods=["POST"])
@jwt_required()
def create_group():
    """إنشاء قروب جديد للمستخدم الحالي (يصبح أدمن)"""
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
    db.session.flush()

    gm = GroupMember(group_id=group.id, user_id=user.id, role="admin")
    db.session.add(gm)
    db.session.commit()

    return jsonify({
        "id": group.id,
        "name": group.name,
        "invite_code": group.invite_code,
        "members_count": 1,
        "role": gm.role,
        "is_member": True,
        "is_owner": True,
    }), 201


# ------------ Group details ------------

@groups_bp.route("/<int:group_id>", methods=["GET"])
@jwt_required()
def get_group(group_id):
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    membership = get_membership(user.id, group.id)
    members_count = GroupMember.query.filter_by(group_id=group.id).count()

    return jsonify({
        "id": group.id,
        "name": group.name,
        "invite_code": group.invite_code,
        "members_count": members_count,
        "is_member": bool(membership),
        "role": membership.role if membership else None,
        "is_owner": is_owner_or_admin(user.id, group),
    }), 200


# ------------ DELETE GROUP (SAFE) ------------

@groups_bp.route("/<int:group_id>", methods=["DELETE"])
@jwt_required()
def delete_group(group_id):
    """Delete group (owner/admin only) + delete relations first"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({"msg": "User not found"}), 404

        group = Group.query.get(group_id)
        if not group:
            return jsonify({"msg": "Group not found"}), 404

        membership = get_membership(user.id, group.id)
        if not membership or (membership.role != "admin" and group.owner_id != user.id):
            return jsonify({"msg": "Only group owner/admin can delete this group"}), 403

        # delete relations first
        GroupMember.query.filter_by(group_id=group_id).delete(synchronize_session=False)
        GroupFile.query.filter_by(group_id=group_id).delete(synchronize_session=False)
        GroupJoinRequest.query.filter_by(group_id=group_id).delete(synchronize_session=False)

        db.session.delete(group)
        db.session.commit()

        return jsonify({"msg": "Group deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        print("DELETE GROUP ERROR:", e)
        return jsonify({"msg": "Failed to delete group", "error": str(e)}), 500


# ------------ Join by invite code (DIRECT JOIN) ------------

@groups_bp.route("/join", methods=["POST"])
@jwt_required()
def join_group_by_code():
    """Invite code = direct join"""
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

    # إذا كان عنده طلب قديم، نخليه approved (اختياري لكنه أنظف)
    jr = GroupJoinRequest.query.filter_by(group_id=group.id, user_id=user.id).first()
    if jr:
        jr.status = "approved"
        jr.decided_at = datetime.utcnow()
        jr.decided_by = user.id

    db.session.commit()

    members_count = GroupMember.query.filter_by(group_id=group.id).count()

    return jsonify({
        "id": group.id,
        "name": group.name,
        "invite_code": group.invite_code,
        "members_count": members_count,
        "role": gm.role,
        "is_member": True,
        "is_owner": False,
    }), 201


# ------------ Request to join (NO CODE) ------------

@groups_bp.route("/<int:group_id>/join-request", methods=["POST"])
@jwt_required()
def create_join_request(group_id):
    """Explore -> request to join (pending)"""
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    if get_membership(user.id, group_id):
        return jsonify({"msg": "You are already a member"}), 400

    existing = GroupJoinRequest.query.filter_by(group_id=group_id, user_id=user.id).first()

    if existing and existing.status == "pending":
        return jsonify({"msg": "Request already pending", "status": "pending"}), 400

    if existing and existing.status in ("rejected", "approved"):
        existing.status = "pending"
        existing.created_at = datetime.utcnow()
        existing.decided_at = None
        existing.decided_by = None
        db.session.commit()
        return jsonify({"msg": "Request re-submitted", "status": "pending"}), 200

    jr = GroupJoinRequest(group_id=group_id, user_id=user.id, status="pending")
    db.session.add(jr)
    db.session.commit()

    return jsonify({"msg": "Request submitted", "status": "pending"}), 201


# ------------ Admin: list join requests ------------

@groups_bp.route("/<int:group_id>/join-requests", methods=["GET"])
@jwt_required()
def list_join_requests(group_id):
    admin = get_current_user()
    if not admin:
        return jsonify({"msg": "User not found"}), 404

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    if not is_owner_or_admin(admin.id, group):
        return jsonify({"msg": "Unauthorized"}), 403

    rows = (
        db.session.query(GroupJoinRequest, User)
        .join(User, GroupJoinRequest.user_id == User.id)
        .filter(GroupJoinRequest.group_id == group_id)
        .order_by(GroupJoinRequest.created_at.desc())
        .all()
    )

    result = []
    for jr, u in rows:
        result.append({
            "request_id": jr.id,
            "user_id": u.id,
            "name": u.name,
            "email": u.email,
            "status": jr.status,
            "created_at": jr.created_at.isoformat(),
        })

    return jsonify(result), 200


# ------------ Admin: approve/reject ------------

@groups_bp.route("/<int:group_id>/join-requests/<int:request_id>/approve", methods=["POST"])
@jwt_required()
def approve_join_request(group_id, request_id):
    admin = get_current_user()
    if not admin:
        return jsonify({"msg": "User not found"}), 404

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    if not is_owner_or_admin(admin.id, group):
        return jsonify({"msg": "Unauthorized"}), 403

    jr = GroupJoinRequest.query.filter_by(id=request_id, group_id=group_id).first()
    if not jr:
        return jsonify({"msg": "Request not found"}), 404
    if jr.status != "pending":
        return jsonify({"msg": f"Request is {jr.status}"}), 400

    if not get_membership(jr.user_id, group_id):
        gm = GroupMember(group_id=group_id, user_id=jr.user_id, role="member")
        db.session.add(gm)

    jr.status = "approved"
    jr.decided_at = datetime.utcnow()
    jr.decided_by = admin.id

    db.session.commit()
    return jsonify({"msg": "Approved"}), 200


@groups_bp.route("/<int:group_id>/join-requests/<int:request_id>/reject", methods=["POST"])
@jwt_required()
def reject_join_request(group_id, request_id):
    admin = get_current_user()
    if not admin:
        return jsonify({"msg": "User not found"}), 404

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    if not is_owner_or_admin(admin.id, group):
        return jsonify({"msg": "Unauthorized"}), 403

    jr = GroupJoinRequest.query.filter_by(id=request_id, group_id=group_id).first()
    if not jr:
        return jsonify({"msg": "Request not found"}), 404
    if jr.status != "pending":
        return jsonify({"msg": f"Request is {jr.status}"}), 400

    jr.status = "rejected"
    jr.decided_at = datetime.utcnow()
    jr.decided_by = admin.id

    db.session.commit()
    return jsonify({"msg": "Rejected"}), 200


# ------------ Members ------------

@groups_bp.route("/<int:group_id>/members", methods=["GET"])
@jwt_required()
def list_members(group_id):
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    membership = get_membership(user.id, group.id)
    if not membership:
        return jsonify({"msg": "You are not a member of this group"}), 403

    rows = (
        db.session.query(GroupMember, User)
        .join(User, GroupMember.user_id == User.id)
        .filter(GroupMember.group_id == group.id)
        .all()
    )

    results = []
    for gm, u in rows:
        results.append({
            "id": gm.id,
            "name": u.name,
            "email": u.email,
            "role": gm.role or "member",
        })

    return jsonify(results), 200


@groups_bp.route("/<int:group_id>/members", methods=["POST"])
@jwt_required()
def add_member(group_id):
    """إضافة عضو جديد للقروب (admin/owner only)"""
    current_user = get_current_user()
    if not current_user:
        return jsonify({"msg": "User not found"}), 404

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    if not is_owner_or_admin(current_user.id, group):
        return jsonify({"msg": "Only owner/admin can add members"}), 403

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()

    if not name:
        return jsonify({"msg": "Name is required"}), 400

    user = User.query.filter_by(email=email).first() if email else None

    if not user:
        random_password = secrets.token_hex(8)
        pw_hash = generate_password_hash(random_password)
        user = User(name=name, email=email or None, password_hash=pw_hash)
        db.session.add(user)
        db.session.flush()

    already = GroupMember.query.filter_by(group_id=group.id, user_id=user.id).first()
    if already:
        return jsonify({"msg": "Member already in this group"}), 400

    gm = GroupMember(group_id=group.id, user_id=user.id, role="member")
    db.session.add(gm)
    db.session.commit()

    return jsonify({
        "id": gm.id,
        "name": user.name,
        "email": user.email,
        "role": gm.role or "member",
    }), 201


# ------------ Files ------------

@groups_bp.route("/<int:group_id>/files", methods=["GET"])
@jwt_required()
def list_files(group_id):
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
        results.append({
            "id": f.id,
            "group_id": f.group_id,
            "name": getattr(f, "original_name", None) or getattr(f, "filename", None),
            "filename": getattr(f, "filename", None),
        })

    return jsonify(results), 200


@groups_bp.route("/<int:group_id>/files", methods=["POST"])
@jwt_required()
def upload_file(group_id):
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    membership = get_membership(user.id, group.id)
    if not membership:
        return jsonify({"msg": "You are not a member of this group"}), 403

    if "file" not in request.files:
        return jsonify({"msg": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"msg": "Empty filename"}), 400

    original_name = secure_filename(file.filename)
    random_suffix = secrets.token_hex(4)
    stored_name = f"{group.id}_{random_suffix}_{original_name}"

    upload_folder = current_app.config.get("UPLOAD_FOLDER", "uploads")
    os.makedirs(upload_folder, exist_ok=True)

    save_path = os.path.join(upload_folder, stored_name)
    file.save(save_path)

    gf = GroupFile(group_id=group.id, filename=stored_name)
    if hasattr(gf, "original_name"):
        gf.original_name = original_name
    if hasattr(gf, "name"):
        gf.name = original_name

    db.session.add(gf)
    db.session.commit()

    return jsonify({
        "id": gf.id,
        "group_id": gf.group_id,
        "name": getattr(gf, "name", None) or getattr(gf, "original_name", None) or original_name,
        "filename": gf.filename,
    }), 201
