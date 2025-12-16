
# temporary change for commit
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta

from extensions import db
from models.user import User
from models.group import Group
from models.group_member import GroupMember
from models.session import StudySession

sessions_bp = Blueprint("sessions", __name__)

# ---------- Helpers ----------

def get_current_user():
    uid = get_jwt_identity()
    return User.query.get(uid) if uid else None


def user_in_group(user_id, group_id):
    return GroupMember.query.filter_by(user_id=user_id, group_id=group_id).first()


def is_group_admin(user_id, group: Group):
    if getattr(group, "owner_id", None) == user_id:
        return True
    gm = GroupMember.query.filter_by(user_id=user_id, group_id=group.id).first()
    return bool(gm and getattr(gm, "role", None) == "admin")


def parse_datetime(value: str):
    """Accepts ISO like: 2025-12-08T20:30 or 2025-12-08T20:30:00"""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except Exception:
        return None


def safe_get(obj, name, default=None):
    """Avoid crashing if DB/model doesn't have a column/attr."""
    try:
        return getattr(obj, name)
    except Exception:
        return default


# ---------- List sessions ----------

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

    return jsonify([
        {
            "id": s.id,
            "group_id": s.group_id,
            "title": s.title,
            "description": s.description,
            "start_time": s.start_time.isoformat() if s.start_time else None,
            "end_time": s.end_time.isoformat() if s.end_time else None,
            "duration_minutes": safe_get(s, "duration_minutes"),
            "status": safe_get(s, "status"),
            "created_by": safe_get(s, "created_by"),
            "created_at": safe_get(s, "created_at").isoformat() if safe_get(s, "created_at") else None,
        }
        for s in sessions
    ]), 200


# ---------- Create session ----------

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

    # ✅ IMPORTANT: Frontend (your code) sends start_time
    start_raw = (data.get("start_time") or "").strip()

    # optional fallback if some screen sends date/time
    date_raw = (data.get("date") or data.get("sessionDate") or "").strip()   # YYYY-MM-DD
    time_raw = (data.get("time") or data.get("sessionTime") or "").strip()   # HH:MM

    duration = data.get("duration_minutes") or data.get("duration") or 60
    try:
        duration = int(duration)
    except Exception:
        duration = 60

    if not title:
        return jsonify({"msg": "Title is required"}), 400

    start_time = None

    # 1) prefer start_time
    if start_raw:
        start_time = parse_datetime(start_raw)

    # 2) fallback to date+time
    if not start_time and date_raw and time_raw:
        start_time = parse_datetime(f"{date_raw}T{time_raw}")

    if not start_time:
        return jsonify({"msg": "Valid start_time is required (ISO)"}), 400

    end_time = start_time + timedelta(minutes=duration)

    s = StudySession(
        group_id=group.id,
        title=title,
        description=description,
        start_time=start_time,
        end_time=end_time,
        created_by=user.id,
    )

    # set duration/status only if exists on your model
    if hasattr(s, "duration_minutes"):
        s.duration_minutes = duration
    if hasattr(s, "status"):
        s.status = "scheduled"

    db.session.add(s)
    db.session.commit()

    return jsonify({
        "id": s.id,
        "group_id": s.group_id,
        "title": s.title,
        "description": s.description,
        "start_time": s.start_time.isoformat() if s.start_time else None,
        "end_time": s.end_time.isoformat() if s.end_time else None,
        "duration_minutes": safe_get(s, "duration_minutes"),
        "status": safe_get(s, "status"),
        "created_by": safe_get(s, "created_by"),
        "created_at": safe_get(s, "created_at").isoformat() if safe_get(s, "created_at") else None,
    }), 201


# ---------- Active session ----------

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
            "duration_minutes": safe_get(active, "duration_minutes"),
            "created_by": safe_get(active, "created_by"),
        }
    }), 200


# ---------- Start session ----------

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

    # Admin only (keeps your old behavior)
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

    duration = safe_get(s, "duration_minutes", 60) or 60
    try:
        duration = int(duration)
    except Exception:
        duration = 60

    s.start_time = now
    s.end_time = now + timedelta(minutes=duration)
    if hasattr(s, "status"):
        s.status = "active"

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
            "duration_minutes": safe_get(s, "duration_minutes"),
            "created_by": safe_get(s, "created_by"),
        }
    }), 200


# ---------- Stop session ----------

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
    if hasattr(s, "status"):
        s.status = "ended"

    db.session.commit()
    return jsonify({"msg": "Session stopped"}), 200


# ---------- Delete session ----------

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
