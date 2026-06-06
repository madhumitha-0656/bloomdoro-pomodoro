import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    SESSION_TYPE = "filesystem"
    SESSION_PERMANENT = False

    SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID", "")
    SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET", "")
    SPOTIFY_REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI", "http://localhost:5000/api/spotify/callback")

    SPOTIFY_SCOPES = (
        "user-read-playback-state "
        "user-modify-playback-state "
        "user-read-currently-playing "
        "streaming "
        "user-read-email "
        "user-read-private"
    )
