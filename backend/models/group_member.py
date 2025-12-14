from extensions import db


class GroupMember(db.Model):
    __tablename__ = "group_members"

    id = db.Column(db.Integer, primary_key=True)

    group_id = db.Column(
        db.Integer,
        db.ForeignKey("groups.id"),
        nullable=False,
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
    )

    # role: "admin" أو "member" مثلاً
    role = db.Column(db.String(50), nullable=True)

    def __repr__(self):
        return f"<GroupMember g={self.group_id} u={self.user_id} role={self.role}>"
