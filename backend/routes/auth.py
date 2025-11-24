from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
)
from functools import wraps

from app import db
from models.user import User

auth_bp = Blueprint("auth", __name__)


# ديكور بسيط عشان الملفات الثانية اللي تستدعي login_required
def login_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs)

    return wrapper


@auth_bp.post("/register")
def register():
    """إنشاء حساب جديد"""
    data = request.get_json() or {}

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not name or not email or not password:
        return jsonify({"msg": "All fields are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"msg": "Email already registered"}), 400

    user = User(
        name=name,
        email=email,
        password_hash=generate_password_hash(password),
    )

    db.session.add(user)
    db.session.commit()

    return jsonify({"msg": "Account created"}), 201


@auth_bp.post("/login")
def login():
    """تسجيل دخول وإرجاع JWT"""
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not email or not password:
        return jsonify({"msg": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"msg": "Invalid email or password"}), 401

    access_token = create_access_token(identity=user.id)

    return jsonify(
        {
            "access_token": access_token,
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
            },
        }
    )


@auth_bp.get("/me")
@jwt_required()
def me():
    """إرجاع بيانات المستخدم الحالي (للتحقق في الفرونت)"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    return jsonify(
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
        }
    )
