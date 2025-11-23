from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os

db = SQLAlchemy()
jwt = JWTManager()


def create_app():
    # تحميل متغيرات .env
    load_dotenv()

    app = Flask(__name__)

    # إعداد قاعدة البيانات
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URL",
        "sqlite:///vsgp.db"  # احتياط لو ما اشتغل الـ .env
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # JWT
    app.config["JWT_SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")
    app.config["JWT_TOKEN_LOCATION"] = ["headers"]
    app.config["JWT_COOKIE_CSRF_PROTECT"] = False
    app.config["JWT_HEADER_TYPE"] = "Bearer"

    # إعداد مجلد رفع الملفات
    upload_folder = os.path.join(os.path.dirname(__file__), "uploads")
    app.config["UPLOAD_FOLDER"] = upload_folder
    os.makedirs(upload_folder, exist_ok=True)

    # تفعيل CORS للفرونت
    CORS(app)

    # تهيئة الإضافات
    db.init_app(app)
    jwt.init_app(app)

    # استيراد النماذج قبل إنشاء الجداول
    from models.user import User  # noqa: F401
    from models.group import StudyGroup  # noqa: F401
    from models.task import Task  # noqa: F401
    from models.file import GroupFile  # noqa: F401

    # تسجيل الـ Blueprints
    from routes.auth import auth_bp
    from routes.groups import groups_bp

    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(groups_bp, url_prefix="/groups")

    # إنشاء الجداول أول مرة
    with app.app_context():
        db.create_all()

    @app.get("/health")
    def health():
        return {"ok": True}

    return app
