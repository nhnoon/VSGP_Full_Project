# backend/models/user.py

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(120), nullable=False)

    group_memberships = db.relationship(
        "GroupMember",
        back_populates="user",
        cascade="all, delete-orphan"
    )
