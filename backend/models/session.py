from extensions import db


class StudySession(db.Model):
    __tablename__ = "study_sessions"

    id = db.Column(db.Integer, primary_key=True)

    # القروب اللي تتبع له الجلسة
    group_id = db.Column(
        db.Integer,
        db.ForeignKey("groups.id"),
        nullable=False,
    )

    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)

    # وقت البداية
    start_time = db.Column(db.DateTime, nullable=False)

    # وقت النهاية (اختياري، نقدر نحسبه من المدة)
    end_time = db.Column(db.DateTime, nullable=True)

    # المدة بالدقائق، عشان التايمر في الواجهة
    duration_minutes = db.Column(db.Integer, nullable=True)

    status = db.Column(db.String(20), default="scheduled", nullable=False)

    # من اللي أنشأ الجلسة
    created_by = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
    )

    created_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        nullable=False,
    )

    def __repr__(self):
        return f"<StudySession {self.id} g={self.group_id} {self.title}>"
