# backend/models/group.py
from app import db
from datetime import datetime

class StudyGroup(db.Model):
    __tablename__ = "study_groups"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    invite_code = db.Column(db.String(16), unique=True, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    memberships = db.relationship(
        "GroupMember",
        back_populates="group",
        cascade="all, delete-orphan"
    )


class GroupMember(db.Model):
    __tablename__ = "group_members"

    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey("study_groups.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    # role: "admin" أو "member"
    role = db.Column(db.String(20), default="member", nullable=False)

    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

    group = db.relationship("StudyGroup", back_populates="memberships")
    user = db.relationship("User", back_populates="group_memberships")
