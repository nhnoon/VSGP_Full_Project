from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models.user import User
from models.group import Group
from models.group_member import GroupMember
from models.session import StudySession
from datetime import datetime, timedelta  # ✅ مهم

sessions_bp = Blueprint("sessions", _name_)


# --------- Helpers ---------

def get_current_user():
    uid = get_jwt_identity()
    if not uid:
        return None
    return User.query.get(uid)


def user_in_group(user_id, group_id):
    return GroupMember.query.filter_by(user_id=user_id, group_id=group_id).first()


def is_group_admin(user_id, group: Group):
    # admin if group owner OR membership role is admin
    if getattr(group, "owner_id", None) == user_id:
        return True

    gm = GroupMember.query.filter_by(user_id=user_id, group_id=group.id).first()
    return bool(gm and gm.role == "admin")


def parse_datetime(value: str):
    """يحاول يحوّل النص إلى datetime بصيغة ISO مثل: 2025-12-08T20:30 أو 2025-12-08T20:30:00Z"""
    if not value:
        return None
    try:
        v = value.strip()
        # يدعم "Z"
        if v.endswith("Z"):
            v = v.replace("Z", "+00:00")
        return datetime.fromisoformat(v)
    except ValueError:
        return None


def session_to_dict(s: StudySession):
    return {
        "id": s.id,
        "group_id": s.group_id,
        "title": s.title,
        "description": s.description,
        "start_time": s.start_time.isoformat() if s.start_time else None,
        "end_time": s.end_time.isoformat() if s.end_time else None,
        "duration_minutes": s.duration_minutes,
        "created_by": s.created_by,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


# --------- List sessions ---------

@sessions_bp.route("/<int:group_id>/sessions", methods=["GET"])
@jwt_required()
def list_sessions(group_id):
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    if not user_in_group(user.id, group.id):
        return jsonify({"msg": "You are not a member of this group"}), 403

    sessions = (
        StudySession.query.filter_by(group_id=group.id)
        .order_by(StudySession.start_time.asc())
        .all()
    )

    return jsonify([session_to_dict(s) for s in sessions]), 200


# --------- Create session ---------

@sessions_bp.route("/<int:group_id>/sessions", methods=["POST"])
@jwt_required()
def create_session(group_id):
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
    start_raw = (data.get("start_time") or "").strip()
    end_raw = (data.get("end_time") or "").strip()

    if not title:
        return jsonify({"msg": "Title is required"}), 400

    start_time = parse_datetime(start_raw)
    if not start_time:
        return jsonify({"msg": "Valid start_time is required (ISO format)"}), 400

    # ✅ duration_minutes دعم كامل
    duration_minutes = data.get("duration_minutes", 60)
    try:
        duration_minutes = int(duration_minutes)
    except Exception:
        duration_minutes = 60

    if duration_minutes < 1:
        duration_minutes = 60

    # end_time اختياري
    end_time = parse_datetime(end_raw) if end_raw else None

    # ✅ إذا ما انرسل end_time نحسبه من duration
    if end_time is None:
        end_time = start_time + timedelta(minutes=duration_minutes)

    s = StudySession(
        group_id=group.id,
        title=title,
        description=description,
        start_time=start_time,
        end_time=end_time,
        duration_minutes=duration_minutes,
        created_by=user.id,
    )

    db.session.add(s)
    db.session.commit()

    return jsonify(session_to_dict(s)), 201


# --------- Update session ---------

@sessions_bp.route("/<int:group_id>/sessions/<int:session_id>", methods=["PATCH"])
@jwt_required()
def update_session(group_id, session_id):
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    if not user_in_group(user.id, group.id):
        return jsonify({"msg": "You are not a member of this group"}), 403

    s = StudySession.query.filter_by(id=session_id, group_id=group.id).first()
    if not s:
        return jsonify({"msg": "Session not found"}), 404

    data = request.get_json() or {}

    if "title" in data:
        new_title = (data.get("title") or "").strip()
        if new_title:
            s.title = new_title

    if "description" in data:
        s.description = (data.get("description") or "").strip()

    if "duration_minutes" in data:
        try:
            s.duration_minutes = int(data.get("duration_minutes"))
        except Exception:
            pass

    if "start_time" in data:
        start_raw = (data.get("start_time") or "").strip()
        parsed = parse_datetime(start_raw)
        if parsed:
            s.start_time = parsed

    if "end_time" in data:
        end_raw = (data.get("end_time") or "").strip()
        s.end_time = parse_datetime(end_raw) if end_raw else None

    # ✅ لو end_time صار None بعد تعديل، احسبه من duration
    if s.start_time and not s.end_time and s.duration_minutes:
        s.end_time = s.start_time + timedelta(minutes=int(s.duration_minutes))

    db.session.commit()
    return jsonify(session_to_dict(s)), 200


# --------- Delete session ---------

@sessions_bp.route("/<int:group_id>/sessions/<int:session_id>", methods=["DELETE"])
@jwt_required()
def delete_session(group_id, session_id):
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    if not user_in_group(user.id, group.id):
        return jsonify({"msg": "You are not a member of this group"}), 403

    s = StudySession.query.filter_by(id=session_id, group_id=group.id).first()
    if not s:
        return jsonify({"msg": "Session not found"}), 404

    db.session.delete(s)
    db.session.commit()
    return jsonify({"msg": "Session deleted"}), 200


# --------- Active session ---------

@sessions_bp.route("/<int:group_id>/sessions/active", methods=["GET"])
@jwt_required()
def get_active_session(group_id):
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    if not user_in_group(user.id, group.id):
        return jsonify({"msg": "You are not a member of this group"}), 403

    now = datetime.utcnow()

    active = (
        StudySession.query.filter(
            StudySession.group_id == group.id,
            StudySession.start_time != None,
            StudySession.end_time != None,
            StudySession.start_time <= now,
            StudySession.end_time > now,
        )
        .order_by(StudySession.end_time.asc())
        .first()
    )

    if not active:
        return jsonify({"active": False, "server_now": now.isoformat()}), 200

    return jsonify({
        "active": True,
        "server_now": now.isoformat(),
        "session": {
            "id": active.id,
            "group_id": active.group_id,
            "title": active.title,
            "description": active.description,
            "start_time": active.start_time.isoformat() if active.start_time else None,
            "end_time": active.end_time.isoformat() if active.end_time else None,
            "duration_minutes": active.duration_minutes,
            "created_by": active.created_by,
        }
    }), 200


# --------- Start session ---------

@sessions_bp.route("/<int:group_id>/sessions/<int:session_id>/start", methods=["POST"])
@jwt_required()
def start_session(group_id, session_id):
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    if not user_in_group(user.id, group.id):
        return jsonify({"msg": "You are not a member of this group"}), 403

    if not is_group_admin(user.id, group):
        return jsonify({"msg": "Only admin can start sessions"}), 403

    s = StudySession.query.filter_by(id=session_id, group_id=group.id).first()
    if not s:
        return jsonify({"msg": "Session not found"}), 404

    now = datetime.utcnow()

    already_active = (
        StudySession.query.filter(
            StudySession.group_id == group.id,
            StudySession.start_time != None,
            StudySession.end_time != None,
            StudySession.start_time <= now,
            StudySession.end_time > now,
            StudySession.id != s.id,
        )
        .first()
    )
    if already_active:
        return jsonify({"msg": "Another session is already active"}), 409

    duration = int(s.duration_minutes or 60)
    s.start_time = now
    s.end_time = now + timedelta(minutes=duration)  # ✅ الآن شغال

    db.session.commit()

    return jsonify({
        "msg": "Session started",
        "session": {
            "id": s.id,
            "group_id": s.group_id,
            "title": s.title,
            "description": s.description,
            "start_time": s.start_time.isoformat() if s.start_time else None,
            "end_time": s.end_time.isoformat() if s.end_time else None,
            "duration_minutes": s.duration_minutes,
            "created_by": s.created_by,
        }
    }), 200


# --------- Stop session ---------

@sessions_bp.route("/<int:group_id>/sessions/<int:session_id>/stop", methods=["POST"])
@jwt_required()
def stop_session(group_id, session_id):
    user = get_current_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"msg": "Group not found"}), 404

    if not user_in_group(user.id, group.id):
        return jsonify({"msg": "You are not a member of this group"}), 403

    if not is_group_admin(user.id, group):
        return jsonify({"msg": "Only admin can stop sessions"}), 403

    s = StudySession.query.filter_by(id=session_id, group_id=group.id).first()
    if not s:
        return jsonify({"msg": "Session not found"}), 404

    s.end_time = datetime.utcnow()
    db.session.commit()

    return jsonify({"msg": "Session stopped"}), 200