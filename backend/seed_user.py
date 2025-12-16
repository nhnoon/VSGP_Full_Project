from app import db, create_app
from models.user import User
from werkzeug.security import generate_password_hash

app = create_app()

with app.app_context():
    # Check if email exists
    user = User.query.filter_by(email="noon@test.com").first()

    if not user:
        hashed = generate_password_hash("123456")
        new_user = User(name="Noon", email="noon@test.com", password=hashed)
        db.session.add(new_user)
        db.session.commit()
        print("User created: noon@test.com / 123456")
    else:
        print("User already exists:", user.email)
