import os
from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from sqlalchemy import text

from extensions import db, jwt


def create_app():
    # Load .env
    load_dotenv()

    app = Flask(__name__)

    # ---------- DATABASE ----------
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URL", "sqlite:///vsgp.db"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # ---------- JWT ----------
    app.config["JWT_SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")
    app.config["JWT_TOKEN_LOCATION"] = ["headers"]
    app.config["JWT_HEADER_TYPE"] = "Bearer"
    app.config["JWT_COOKIE_CSRF_PROTECT"] = False

    # ---------- UPLOADS ----------
    upload_folder = os.path.join(os.path.dirname(__file__), "uploads")
    app.config["UPLOAD_FOLDER"] = upload_folder
    os.makedirs(upload_folder, exist_ok=True)

    # ---------- CORS ----------
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

    # ---------- Init Extensions ----------
    db.init_app(app)
    jwt.init_app(app)

    # Import models (important)
    from models.user import User
    from models.group import Group
    from models.group_member import GroupMember
    from models.task import Task
    from models.file import GroupFile

    # Import routes
    from routes.auth import auth_bp
    from routes.groups import groups_bp
    from routes.messages import messages_bp
    from routes.tasks import tasks_bp

    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(groups_bp, url_prefix="/groups")
    app.register_blueprint(messages_bp, url_prefix="/groups")
    app.register_blueprint(tasks_bp, url_prefix="/groups")

    # ---------- DB Init ----------
    with app.app_context():

        # إذا كان SQLite نحذف القديم (فقط محلي)
        db_uri = app.config["SQLALCHEMY_DATABASE_URI"]
        if db_uri.startswith("sqlite:///") and os.getenv("FLASK_ENV") == "development":
            db_path = db_uri.replace("sqlite:///", "", 1)
            if not os.path.isabs(db_path):
                db_path = os.path.join(os.path.dirname(__file__), db_path)
            if os.path.exists(db_path):
                try:
                    os.remove(db_path)
                except OSError:
                    pass

        # Create all SQLAlchemy tables
        db.create_all()

        # ---------- FIX: PostgreSQL-compatible messages table ----------
        db.session.execute(
            text("""
                CREATE TABLE IF NOT EXISTS messages (
                    id SERIAL PRIMARY KEY,
                    group_id INTEGER NOT NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
        )

        # Create default admin user
        from werkzeug.security import generate_password_hash

        default_email = os.getenv("DEFAULT_ADMIN_EMAIL", "noon@test.com")
        default_password = os.getenv("DEFAULT_ADMIN_PASSWORD", "password123")

        existing = User.query.filter_by(email=default_email).first()
        if not existing:
            pw_hash = generate_password_hash(default_password)
            user = User(name="Noon", email=default_email, password_hash=pw_hash)
            db.session.add(user)

        db.session.commit()

    @app.get("/health")
    def health():
        return {"ok": True}

    return app


# Important for JWT to load users
@jwt.user_lookup_loader
def load_user_callback(_jwt_header, jwt_data):
    from models.user import User
    identity = jwt_data.get("sub")
    try:
        user_id = int(identity)
    except (TypeError, ValueError):
        return None
    return User.query.get(user_id)
