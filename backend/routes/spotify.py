import urllib.parse
import requests
from flask import Blueprint, request, jsonify, session, redirect
from config import Config

spotify_bp = Blueprint("spotify", __name__)

AUTH_URL = "https://accounts.spotify.com/authorize"
TOKEN_URL = "https://accounts.spotify.com/api/token"
API_BASE  = "https://api.spotify.com/v1"


def _is_configured():
    return bool(Config.SPOTIFY_CLIENT_ID and Config.SPOTIFY_CLIENT_SECRET)


@spotify_bp.route("/config-status")
def config_status():
    """Let the frontend know whether Spotify credentials are set."""
    return jsonify({"configured": _is_configured()})


@spotify_bp.route("/login")
def login():
    if not _is_configured():
        return redirect("/?spotify_error=not_configured")
    params = {
        "client_id":    Config.SPOTIFY_CLIENT_ID,
        "response_type":"code",
        "redirect_uri": Config.SPOTIFY_REDIRECT_URI,
        "scope":        Config.SPOTIFY_SCOPES,
        "show_dialog":  True,
    }
    return redirect(f"{AUTH_URL}?{urllib.parse.urlencode(params)}")


@spotify_bp.route("/callback")
def callback():
    error = request.args.get("error")
    if error:
        return redirect("/?spotify_error=access_denied")

    code = request.args.get("code")
    resp = requests.post(TOKEN_URL, data={
        "grant_type":   "authorization_code",
        "code":         code,
        "redirect_uri": Config.SPOTIFY_REDIRECT_URI,
        "client_id":    Config.SPOTIFY_CLIENT_ID,
        "client_secret":Config.SPOTIFY_CLIENT_SECRET,
    }, timeout=10)

    token_data = resp.json()
    if "access_token" not in token_data:
        return redirect("/?spotify_error=token_failed")

    session["spotify_access_token"]  = token_data["access_token"]
    session["spotify_refresh_token"] = token_data.get("refresh_token")
    return redirect("/?spotify_connected=true")


@spotify_bp.route("/status")
def status():
    token = _get_valid_token()
    if not token:
        return jsonify({"connected": False, "configured": _is_configured()})
    resp = requests.get(f"{API_BASE}/me",
                        headers={"Authorization": f"Bearer {token}"}, timeout=8)
    if resp.status_code != 200:
        return jsonify({"connected": False, "configured": _is_configured()})
    data = resp.json()
    return jsonify({
        "connected":    True,
        "configured":   True,
        "display_name": data.get("display_name", ""),
        "email":        data.get("email", ""),
    })


@spotify_bp.route("/now-playing")
def now_playing():
    token = _get_valid_token()
    if not token:
        return jsonify({"playing": False})
    resp = requests.get(f"{API_BASE}/me/player/currently-playing",
                        headers={"Authorization": f"Bearer {token}"}, timeout=8)
    if resp.status_code in (204, 401) or resp.status_code != 200:
        return jsonify({"playing": False})
    data = resp.json()
    item = data.get("item") or {}
    images = item.get("album", {}).get("images") or []
    return jsonify({
        "playing":     data.get("is_playing", False),
        "track_name":  item.get("name", ""),
        "artist":      ", ".join(a["name"] for a in item.get("artists", [])),
        "album_art":   images[0].get("url", "") if images else "",
        "progress_ms": data.get("progress_ms", 0),
        "duration_ms": item.get("duration_ms", 0),
    })


@spotify_bp.route("/play",  methods=["POST"])
def play():
    token = _get_valid_token()
    if not token: return jsonify({"error": "not connected"}), 401
    requests.put(f"{API_BASE}/me/player/play",
                 headers={"Authorization": f"Bearer {token}"}, timeout=8)
    return jsonify({"status": "ok"})


@spotify_bp.route("/pause", methods=["POST"])
def pause():
    token = _get_valid_token()
    if not token: return jsonify({"error": "not connected"}), 401
    requests.put(f"{API_BASE}/me/player/pause",
                 headers={"Authorization": f"Bearer {token}"}, timeout=8)
    return jsonify({"status": "ok"})


@spotify_bp.route("/next",  methods=["POST"])
def skip_next():
    token = _get_valid_token()
    if not token: return jsonify({"error": "not connected"}), 401
    requests.post(f"{API_BASE}/me/player/next",
                  headers={"Authorization": f"Bearer {token}"}, timeout=8)
    return jsonify({"status": "ok"})


@spotify_bp.route("/disconnect", methods=["POST"])
def disconnect():
    session.pop("spotify_access_token", None)
    session.pop("spotify_refresh_token", None)
    return jsonify({"status": "ok"})


# ── Internal helpers ─────────────────────────────────────────────────────────

def _get_valid_token():
    token = session.get("spotify_access_token")
    if not token:
        return None
    test = requests.get(f"{API_BASE}/me",
                        headers={"Authorization": f"Bearer {token}"}, timeout=8)
    if test.status_code == 401:
        return _refresh_token()
    return token if test.status_code == 200 else None


def _refresh_token():
    refresh = session.get("spotify_refresh_token")
    if not refresh:
        return None
    resp = requests.post(TOKEN_URL, data={
        "grant_type":    "refresh_token",
        "refresh_token": refresh,
        "client_id":     Config.SPOTIFY_CLIENT_ID,
        "client_secret": Config.SPOTIFY_CLIENT_SECRET,
    }, timeout=10)
    new_token = resp.json().get("access_token")
    if new_token:
        session["spotify_access_token"] = new_token
    return new_token
