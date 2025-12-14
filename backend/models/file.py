from extensions import db


class GroupFile(db.Model):
    __tablename__ = "group_files"

    id = db.Column(db.Integer, primary_key=True)

    group_id = db.Column(
        db.Integer,
        db.ForeignKey("groups.id"),
        nullable=False,
    )

    # اسم الملف داخل السيرفر (المخزَّن فعلياً)
    filename = db.Column(db.String(255), nullable=False)

    # الاسم الأصلي للملف وقت الرفع (اختياري)
    original_name = db.Column(db.String(255), nullable=True)

    def __repr__(self):
        return f"<GroupFile {self.id} g={self.group_id} {self.filename}>"
