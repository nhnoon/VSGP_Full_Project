from extensions import db


class Group(db.Model):
    __tablename__ = "groups"  # مهم: هذا اللي تستعمله الـ ForeignKey "groups.id"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    invite_code = db.Column(db.String(20), unique=True, nullable=False)

    # صاحب (مالك) القروب
    owner_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),  # يربط مع جدول users
        nullable=False,
    )

    # أعضاء القروب
    members = db.relationship(
        "GroupMember",
        backref="group",
        cascade="all, delete",
        lazy=True,
    )

    # ملفات القروب
    files = db.relationship(
        "GroupFile",
        backref="group",
        cascade="all, delete",
        lazy=True,
    )

    # جلسات المذاكرة
    sessions = db.relationship(
        "StudySession",
        backref="group",
        cascade="all, delete",
        lazy=True,
    )

    def __repr__(self):
        return f"<Group {self.id} {self.name}>"
