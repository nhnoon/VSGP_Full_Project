from app import db


class StudyGroup(db.Model):
  __tablename__ = "study_group"

  id = db.Column(db.Integer, primary_key=True)
  name = db.Column(db.String(120), nullable=False)
  owner_id = db.Column(db.Integer, nullable=False)
  invite_code = db.Column(db.String(16), unique=True, nullable=False)

  # علاقة مع الأعضاء
  members = db.relationship(
      "GroupMember",
      back_populates="group",
      cascade="all, delete-orphan",
      lazy=True,
  )


class GroupMember(db.Model):
  __tablename__ = "group_member"

  id = db.Column(db.Integer, primary_key=True)
  group_id = db.Column(
      db.Integer,
      db.ForeignKey("study_group.id"),
      nullable=False,
  )
  name = db.Column(db.String(80), nullable=False)
  email = db.Column(db.String(120))
  role = db.Column(db.String(20), default="member")
  joined_at = db.Column(db.DateTime, server_default=db.func.now())

  group = db.relationship("StudyGroup", back_populates="members")
