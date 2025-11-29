from extensions import db
from werkzeug.security import generate_password_hash, check_password_hash


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    # المجموعات اللي يملكها المستخدم (كـ owner)
    groups_owned = db.relationship("Group", backref="owner", lazy=True)

    # عضويات المستخدم في المجموعات
    memberships = db.relationship(
        "GroupMember",
        backref="user",
        cascade="all, delete"
    )

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)
