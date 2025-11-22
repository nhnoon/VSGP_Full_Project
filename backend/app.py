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

    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URL",
        "sqlite:///vsgp.db"  # احتياط لو ما اشتغل الـ .env
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")
    # نحدد صراحة أن التوكن موجود في الـ Headers فقط
    app.config["JWT_TOKEN_LOCATION"] = ["headers"]
    app.config["JWT_COOKIE_CSRF_PROTECT"] = False
    app.config["JWT_HEADER_TYPE"] = "Bearer"

    # تفعيل CORS للفرونت
    CORS(app)

    # تهيئة الإضافات
    db.init_app(app)
    jwt.init_app(app)

    # استيراد النماذج قبل إنشاء الجداول
    from models.user import User        # noqa: F401
    from models.group import StudyGroup # noqa: F401
    from models.task import Task        # noqa: F401  ← جدول المهام

    # استيراد الـ Blueprints بعد ما يكون كل شيء جاهز
    from routes.auth import auth_bp
    from routes.groups import groups_bp
    from routes.tasks import tasks_bp   # ← راوت المهام

    # تسجيل الـ Blueprints
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(groups_bp, url_prefix="/groups")
    app.register_blueprint(tasks_bp)    # بدون prefix: المسارات تبدأ بـ /groups/...

    # إنشاء الجداول أول مرة
    with app.app_context():
        db.create_all()

    @app.get("/health")
    def health():
        return {"ok": True}

    return app
