import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_session import Session
from config import Config
from routes.timer import timer_bp
from routes.spotify import spotify_bp
from routes.garden import garden_bp

app = Flask(__name__, static_folder="../frontend", static_url_path="")
app.config.from_object(Config)

CORS(app, supports_credentials=True, origins=["http://localhost:5000", "http://127.0.0.1:5000"])
Session(app)

app.register_blueprint(timer_bp, url_prefix="/api/timer")
app.register_blueprint(spotify_bp, url_prefix="/api/spotify")
app.register_blueprint(garden_bp, url_prefix="/api/garden")


@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(app.static_folder, path)


if __name__ == "__main__":
    os.makedirs("flask_session", exist_ok=True)
    app.run(debug=True, port=5000)
