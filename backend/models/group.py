from extensions import db


class Group(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    invite_code = db.Column(db.String(20), unique=True, nullable=False)

    # صاحب (مالك) القروب
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    # أعضاء القروب
    members = db.relationship(
        "GroupMember",
        backref="group",
        cascade="all, delete"
    )
