# backend/app.py

from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
from sqlalchemy import text
import os

# نجهز الـ extensions
db = SQLAlchemy()
jwt = JWTManager()


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
    from models.group import StudyGroup   # noqa: F401
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
        # إنشاء الجداول في قاعدة البيانات
        db.create_all()

        # إنشاء جدول الرسائل لو مو موجود
        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))

        # ===== إنشاء مستخدم افتراضي للدخول من Vercel / أي مكان =====
        # تقدرين تغيّرين الإيميل والباسورد من هنا أو من متغيرات البيئة
        default_email = os.getenv("DEFAULT_ADMIN_EMAIL", "noon@test.com")
        default_password = os.getenv("DEFAULT_ADMIN_PASSWORD", "password123")

        existing = User.query.filter_by(email=default_email).first()
        if not existing:
            user = User(
                name="Noon",
                email=default_email,
            )

            # لو عندك method اسمها set_password نستخدمها
            if hasattr(user, "set_password"):
                user.set_password(default_password)
            else:
                # محاولة التعامل مع الحقول الشائعة لو ما فيه set_password
                try:
                    from werkzeug.security import generate_password_hash
                    pw_hash = generate_password_hash(default_password)

                    if hasattr(user, "password_hash"):
                        user.password_hash = pw_hash
                    elif hasattr(user, "password"):
                        user.password = pw_hash
                except Exception:
                    # لو ما عرفنا نعمل هاش نخليه زي ما هو (أسوأ الأحوال)
                    pass

            db.session.add(user)

        db.session.commit()

    # مسار بسيط لفحص أن الباك إند شغال
    @app.get("/health")
    def health():
        return {"ok": True}

    return app


# ربط الـ JWT بالمستخدم عشان @jwt_required ترجع لنا الـ current_user
@jwt.user_lookup_loader
def load_user_callback(_jwt_header, jwt_data):
    from models.user import User  # استيراد هنا لتجنب الدوران
    identity = jwt_data.get("sub")
    try:
        user_id = int(identity)
    except (TypeError, ValueError):
        return None
    return User.query.get(user_id)
