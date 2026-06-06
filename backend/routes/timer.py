from flask import Blueprint, request, jsonify, session
from datetime import datetime

timer_bp = Blueprint("timer", __name__)

_sessions = {}


def get_user_id():
    if "user_id" not in session:
        session["user_id"] = f"guest_{id(session)}"
    return session["user_id"]


@timer_bp.route("/settings", methods=["GET"])
def get_settings():
    uid = get_user_id()
    return jsonify(_sessions.get(uid, {}).get("settings", _default_settings()))


@timer_bp.route("/settings", methods=["POST"])
def save_settings():
    uid = get_user_id()
    data = request.get_json(force=True)
    if uid not in _sessions:
        _sessions[uid] = {"settings": _default_settings(), "history": []}
    _sessions[uid]["settings"].update(data)
    return jsonify(_sessions[uid]["settings"])


@timer_bp.route("/complete-session", methods=["POST"])
def complete_session():
    uid = get_user_id()
    data = request.get_json(force=True)
    if uid not in _sessions:
        _sessions[uid] = {"settings": _default_settings(), "history": []}
    entry = {
        "type": data.get("type", "focus"),
        "duration_minutes": data.get("duration_minutes", 25),
        "completed_at": datetime.utcnow().isoformat(),
    }
    _sessions[uid]["history"].append(entry)
    return jsonify({"status": "ok", "entry": entry})


@timer_bp.route("/history", methods=["GET"])
def get_history():
    uid = get_user_id()
    history = _sessions.get(uid, {}).get("history", [])
    return jsonify(history)


def _default_settings():
    return {
        "focus_minutes": 25,
        "short_break_minutes": 5,
        "long_break_minutes": 15,
        "sessions_before_long_break": 4,
        "auto_start_breaks": False,
        "auto_start_focus": False,
        "sound_enabled": True,
    }
