from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os
from sqlalchemy import text

db = SQLAlchemy()
jwt = JWTManager()


def create_app():
    # تحميل متغيرات البيئة
    load_dotenv()

    app = Flask(__name__)

    # إعداد قاعدة البيانات
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URL",
        "sqlite:///vsgp.db"  # قاعدة افتراضية لو .env غير موجود
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # إعداد JWT
    app.config["JWT_SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")
    app.config["JWT_TOKEN_LOCATION"] = ["headers"]
    app.config["JWT_COOKIE_CSRF_PROTECT"] = False
    app.config["JWT_HEADER_TYPE"] = "Bearer"

    # إعداد مسار رفع الملفات
    upload_folder = os.path.join(os.path.dirname(__file__), "uploads")
    app.config["UPLOAD_FOLDER"] = upload_folder
    os.makedirs(upload_folder, exist_ok=True)

    # تفعيل CORS
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

    # تهيئة المكتبات
    db.init_app(app)
    jwt.init_app(app)

    # استيراد الموديلات
    from models.user import User   # noqa: F401
    from models.group import StudyGroup  # noqa: F401
    from models.task import Task    # noqa: F401
    from models.file import GroupFile  # noqa: F401

    # تسجيل الراوتس
    from routes.auth import auth_bp
    from routes.groups import groups_bp
    from routes.messages import messages_bp

    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(groups_bp, url_prefix="/groups")
    app.register_blueprint(messages_bp, url_prefix="/groups")

    # إنشاء الجداول أول مرة
    with app.app_context():
        db.create_all()

        # جدول الرسائل (جديد)
        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        db.session.commit()

    # فحص سريع
    @app.get("/health")
    def health():
        return {"ok": True}

    return app
