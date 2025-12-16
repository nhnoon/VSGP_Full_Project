# backend/routes/files.py

import os
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename

from extensions import db
from models.group import Group
from models.group_member import GroupMember
from models.user import User
from models.file import GroupFile

files_bp = Blueprint("files", __name__)

# ================== إعدادات ==================

UPLOAD_FOLDER = "uploads"

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# ================== Helpers ==================

def get_current_user():
    uid = get_jwt_identity()
    if not uid:
        return None
    return User.query.get(uid)


def user_in_group(user_id, group_id):
    return GroupMember.query.filter_by(
        user_id=user_id,
        group_id=group_id
    ).first()

# ================== GET: جلب ملفات القروب ==================

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

    files = GroupFile.query.filter_by(group_id=group_id).all()

    return jsonify([
        {
            "id": f.id,
            "filename": f.filename,
            "original_name": f.original_name
        }
        for f in files
    ]), 200

# ================== POST: رفع ملف ==================

@files_bp.route("/<int:group_id>/files", methods=["POST"])
@jwt_required()
def upload_file(group_id):
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    if not user_in_group(user.id, group.id):
        return jsonify({"msg": "You are not a member of this group"}), 403

    if "file" not in request.files:
        return jsonify({"msg": "No file provided"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"msg": "Empty filename"}), 400

    original_name = file.filename
    filename = secure_filename(original_name)

    save_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(save_path)

    new_file = GroupFile(
        group_id=group_id,
        filename=filename,
        original_name=original_name
    )

    db.session.add(new_file)
    db.session.commit()

    return jsonify({
        "id": new_file.id,
        "filename": new_file.filename,
        "original_name": new_file.original_name
    }), 201
