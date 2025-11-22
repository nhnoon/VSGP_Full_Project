# backend/models/task.py
from datetime import datetime
from app import db


class Task(db.Model):
    __tablename__ = "tasks"

    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, nullable=False)  # StudyGroup.id
    title = db.Column(db.String(200), nullable=False)
    due_date = db.Column(db.Date, nullable=True)
    is_done = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        """نحوله لقاموس بنفس الشكل اللي الفرونت يتوقعه"""
        return {
            "id": self.id,
            "group_id": self.group_id,
            "title": self.title,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "is_done": self.is_done,
        }

    def __repr__(self):
        return f"<Task {self.title}>"
