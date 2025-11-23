from datetime import datetime
from app import db


class GroupFile(db.Model):
    __tablename__ = "group_files"

    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, nullable=False)  # Foreign key لـ StudyGroup
    filename = db.Column(db.String(255), nullable=False)       # الاسم المخزَّن في السيرفر
    original_name = db.Column(db.String(255), nullable=False)  # الاسم الأصلي للملف
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "group_id": self.group_id,
            "filename": self.filename,
            "original_name": self.original_name,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "download_url": f"/groups/files/{self.id}/download",
        }

    def __repr__(self):
        return f"<GroupFile {self.original_name}>"
