from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy   # يمكننا حذفه الآن لكن خليه مؤقتاً
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
from sqlalchemy import text
import os

# 👇 استخدمي الـ db و jwt من extensions بدل ما نعرّفهم هنا
from extensions import db, jwt


def create_app():
    # تحميل متغيرات البيئة (.env)
    load_dotenv()

    app = Flask(__name__)

    # إعداد قاعدة البيانات
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URL",
        "sqlite:///vsgp.db"   # لو ما فيه DATABASE_URL يستخدم SQLite
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # إعداد JWT
    app.config["JWT_SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")
    app.config["JWT_TOKEN_LOCATION"] = ["headers"]
    app.config["JWT_COOKIE_CSRF_PROTECT"] = False
    app.config["JWT_HEADER_TYPE"] = "Bearer"

    # مسار رفع الملفات
    upload_folder = os.path.join(os.path.dirname(__file__), "uploads")
    app.config["UPLOAD_FOLDER"] = upload_folder
    os.makedirs(upload_folder, exist_ok=True)

    # تفعيل CORS
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

    # تهيئة الـ extensions مع التطبيق
    db.init_app(app)
    jwt.init_app(app)

    # استيراد الموديلات حتى تُعرّف الجداول
    from models.user import User          # noqa: F401
    from models.group import Group   # noqa: F401
    from models.task import Task          # noqa: F401
    from models.file import GroupFile     # noqa: F401

    # استيراد وتسجيل الـ blueprints
    from routes.auth import auth_bp
    from routes.groups import groups_bp
    from routes.messages import messages_bp

    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(groups_bp, url_prefix="/groups")
    app.register_blueprint(messages_bp, url_prefix="/groups")

    # إنشاء الجداول + تهيئة البيانات
    with app.app_context():
        db.create_all()

        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))

        default_email = os.getenv("DEFAULT_ADMIN_EMAIL", "noon@test.com")
        default_password = os.getenv("DEFAULT_ADMIN_PASSWORD", "password123")

        existing = User.query.filter_by(email=default_email).first()
        if not existing:
            user = User(
                name="Noon",
                email=default_email,
            )

            if hasattr(user, "set_password"):
                user.set_password(default_password)
            else:
                from werkzeug.security import generate_password_hash
                pw_hash = generate_password_hash(default_password)

                if hasattr(user, "password_hash"):
                    user.password_hash = pw_hash
                elif hasattr(user, "password"):
                    user.password = pw_hash

            db.session.add(user)

        db.session.commit()

    @app.get("/health")
    def health():
        return {"ok": True}

    return app


@jwt.user_lookup_loader
def load_user_callback(_jwt_header, jwt_data):
    from models.user import User
    identity = jwt_data.get("sub")
    try:
        user_id = int(identity)
    except (TypeError, ValueError):
        return None
    return User.query.get(user_id)
