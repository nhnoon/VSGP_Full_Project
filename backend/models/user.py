from extensions import db


class User(db.Model):
    __tablename__ = "users"  # مهم جداً عشان الـ ForeignKey يشتغل صح

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)

    # علاقات اختيارية (مو ضرورية للخطأ لكن مفيدة)
    groups = db.relationship(
        "GroupMember",
        backref="user",
        cascade="all, delete",
        lazy=True,
    )

    sessions_created = db.relationship(
        "StudySession",
        backref="creator",
        lazy=True,
        foreign_keys="StudySession.created_by",
    )

    def __repr__(self):
        return f"<User {self.id} {self.email}>"
