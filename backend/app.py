import os
from pathlib import Path
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from flask_session import Session
from flask_login import LoginManager

from config import Config
from models.user import db, User
from routes.timer   import timer_bp
from routes.spotify import spotify_bp
from routes.garden  import garden_bp
from routes.auth    import auth_bp, init_oauth

FRONTEND = Path(__file__).parent.parent / "frontend"

app = Flask(__name__, static_folder=str(FRONTEND), static_url_path="")
app.config.from_object(Config)

# ── Extensions ───────────────────────────────────────────────────────────────
CORS(app, supports_credentials=True)
Session(app)
db.init_app(app)
init_oauth(app)

login_manager = LoginManager(app)
login_manager.login_view = None   # API — return 401 instead of redirect

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(user_id)

@login_manager.unauthorized_handler
def unauthorized():
    return jsonify({"error": "Login required"}), 401

# ── Blueprints ────────────────────────────────────────────────────────────────
app.register_blueprint(timer_bp,   url_prefix="/api/timer")
app.register_blueprint(spotify_bp, url_prefix="/api/spotify")
app.register_blueprint(garden_bp,  url_prefix="/api/garden")
app.register_blueprint(auth_bp,    url_prefix="/auth")

# ── DB init ───────────────────────────────────────────────────────────────────
with app.app_context():
    os.makedirs("flask_session", exist_ok=True)
    db.create_all()

# ── Frontend ──────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(app.static_folder, path)

if __name__ == "__main__":
    app.run(debug=True, port=5000)
