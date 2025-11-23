from flask import Blueprint, request, jsonify
from app import db
from sqlalchemy import text

messages_bp = Blueprint("messages", __name__)

# =================== جلب رسائل القروب ===================

@messages_bp.route("/<int:group_id>/messages", methods=["GET"])
def list_messages(group_id):
    rows = db.session.execute(
        text("""
            SELECT id, group_id, content, created_at
            FROM messages
            WHERE group_id = :gid
            ORDER BY created_at ASC
        """),
        {"gid": group_id}
    ).mappings().all()

    messages = []
    for row in rows:
        messages.append({
            "id": row["id"],
            "group_id": row["group_id"],
            "content": row["content"],
            # created_at عندنا نص جاهز من SQLite، ما نحتاج isoformat
            "created_at": row["created_at"],
        })

    return jsonify(messages)


# =================== إضافة رسالة جديدة ===================

@messages_bp.route("/<int:group_id>/messages", methods=["POST"])
def create_message(group_id):
    data = request.get_json() or {}
    content = (data.get("content") or "").strip()

    if not content:
        return jsonify({"msg": "Content is required"}), 400

    # إدخال الرسالة
    result = db.session.execute(
        text("""
            INSERT INTO messages (group_id, content)
            VALUES (:gid, :content)
        """),
        {"gid": group_id, "content": content}
    )
    db.session.commit()

    message_id = getattr(result, "lastrowid", None)

    # نرجّع نفس البيانات اللي أضفناها (بشكل بسيط)
    message = {
        "id": message_id,
        "group_id": group_id,
        "content": content,
        "created_at": None,
    }

    return jsonify(message), 201
