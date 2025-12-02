# backend/routes/files.py
import os
from flask import Blueprint, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

from models.group import Group
from models.group_member import GroupMember
from models.user import User

files_bp = Blueprint("files", __name__)


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


# ---------- جلب ملفات القروب ----------
# مبدئياً نرجّع قائمة فاضية بس عشان ما يطيّح الصفحة
@files_bp.route("/<int:group_id>/files", methods=["GET"])
@jwt_required()
def list_files(group_id):
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    if not user_in_group(user.id, group.id):
        return jsonify({"msg": "You are not a member of this group"}), 403

    # مستقبلاً تقدري تربطي هنا مع جدول GroupFile
    # حالياً نرجّع قائمة فاضية عشان كل شيء يشتغل بدون أخطاء
    return jsonify([]), 200
