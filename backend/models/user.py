from datetime import datetime
from app import db


class User(db.Model):
    # اسم الجدول حيكون "user" (زي ما كان في الخطأ السابق)
    id = db.Column(db.Integer, primary_key=True)

    # الاسم مطلوب (NOT NULL)
    name = db.Column(db.String(120), nullable=False)

    email = db.Column(db.String(120), unique=True, nullable=False, index=True)

    # هنخزن الباسورد مشفّر
    password_hash = db.Column(db.String(200), nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<User {self.email}>"
