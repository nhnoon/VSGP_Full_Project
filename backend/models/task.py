from datetime import datetime
from app import db


class Task(db.Model):
    __tablename__ = "tasks"

    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, nullable=False)  # StudyGroup.id
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)   # وصف المهمة
    priority = db.Column(db.String(20), default="normal")  # low / normal / high
    due_date = db.Column(db.Date, nullable=True)
    is_done = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "group_id": self.group_id,
            "title": self.title,
            "description": self.description,
            "priority": self.priority,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "is_done": self.is_done,
        }

    def __repr__(self):
        return f"<Task {self.title}>"
