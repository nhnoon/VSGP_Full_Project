from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models.user import User
from models.group import Group
from models.group_member import GroupMember
from models.session import StudySession

from datetime import datetime, timedelta

sessions_bp = Blueprint("sessions", __name__)


# --------- Helpers ---------


def get_current_user():
    uid = get_jwt_identity()
    if not uid:
        return None
    return User.query.get(uid)


def user_in_group(user_id, group_id):
    return GroupMember.query.filter_by(
        user_id=user_id, group_id=group_id
    ).first()


def parse_datetime(value: str):
    """
    يحاول يحوّل النص إلى datetime بصيغة ISO مثل:
    2025-12-08T20:30
    أو: 2025-12-08
    """
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


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

    return (
        jsonify(
            [
                {
                    "id": s.id,
                    "group_id": s.group_id,
                    "title": s.title,
                    "description": s.description,
                    "start_time": s.start_time.isoformat() if s.start_time else None,
                    "end_time": s.end_time.isoformat() if s.end_time else None,
                    "duration_minutes": s.duration_minutes,
                    "created_by": s.created_by,
                    "created_at": s.created_at.isoformat()
                    if s.created_at
                    else None,
                }
                for s in sessions
            ]
        ),
        200,
    )


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

    title = (data.get("title") or "").trim()
    description = (data.get("description") or "").strip()
    start_raw = (data.get("start_time") or "").strip()
    duration_minutes = data.get("duration_minutes")

    if not title:
        return jsonify({"msg": "Title is required"}), 400

    start_time = parse_datetime(start_raw)
    if not start_time:
        return jsonify({"msg": "Valid start_time is required (ISO format)"}), 400

    try:
        duration_minutes = int(duration_minutes) if duration_minutes else 60
    except (TypeError, ValueError):
        duration_minutes = 60

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

    return (
        jsonify(
            {
                "id": s.id,
                "group_id": s.group_id,
                "title": s.title,
                "description": s.description,
                "start_time": s.start_time.isoformat(),
                "end_time": s.end_time.isoformat() if s.end_time else None,
                "duration_minutes": s.duration_minutes,
                "created_by": s.created_by,
                "created_at": s.created_at.isoformat()
                if s.created_at
                else None,
            }
        ),
        201,
    )


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
        new_title = (data["title"] or "").strip()
        if new_title:
            s.title = new_title

    if "description" in data:
        s.description = (data["description"] or "").strip()

    if "start_time" in data:
        start_raw = (data["start_time"] or "").strip()
        new_start = parse_datetime(start_raw)
        if new_start:
            s.start_time = new_start

    if "duration_minutes" in data:
        try:
          new_duration = int(data["duration_minutes"])
        except (TypeError, ValueError):
          new_duration = s.duration_minutes or 60
        s.duration_minutes = new_duration

    # تحديث end_time بناءً على start_time و duration
    if s.start_time and s.duration_minutes:
        s.end_time = s.start_time + timedelta(minutes=s.duration_minutes)

    db.session.commit()

    return (
        jsonify(
            {
                "id": s.id,
                "group_id": s.group_id,
                "title": s.title,
                "description": s.description,
                "start_time": s.start_time.isoformat()
                if s.start_time
                else None,
                "end_time": s.end_time.isoformat() if s.end_time else None,
                "duration_minutes": s.duration_minutes,
                "created_by": s.created_by,
                "created_at": s.created_at.isoformat()
                if s.created_at
                else None,
            }
        ),
        200,
    )


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
