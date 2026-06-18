from flask import Blueprint, request, jsonify, session
from flask_login import current_user
from models.user import db, User

garden_bp = Blueprint("garden", __name__)

# ── Helpers ──────────────────────────────────────────────────────────────────

def _get_guest_state():
    return session.get("garden", _default_guest())


def _save_guest_state(state):
    session["garden"] = state


def _default_guest():
    return {
        "theme": "flower",
        "total_minutes": 0,
        "growth_level": 0,
        "sessions_completed": 0,
        "streak": 0,
    }


# ── Routes ───────────────────────────────────────────────────────────────────

@garden_bp.route("/state", methods=["GET"])
def get_state():
    if current_user.is_authenticated:
        return jsonify(current_user.to_dict())
    return jsonify(_get_guest_state())


@garden_bp.route("/add-time", methods=["POST"])
def add_time():
    data    = request.get_json(force=True)
    minutes = int(data.get("minutes", 0))

    if current_user.is_authenticated:
        updated = current_user.add_focus_minutes(minutes)
        db.session.commit()
        return jsonify(updated)

    # Guest path
    state = _get_guest_state()
    state["total_minutes"]      += minutes
    state["sessions_completed"] += 1
    state["growth_level"]        = _calc_growth(state["total_minutes"])
    _save_guest_state(state)
    return jsonify(state)


@garden_bp.route("/select-theme", methods=["POST"])
def select_theme():
    data  = request.get_json(force=True)
    theme = data.get("theme", "flower")

    if current_user.is_authenticated:
        current_user.theme = theme
        db.session.commit()
        return jsonify(current_user.to_dict())

    state = _get_guest_state()
    state["theme"] = theme
    _save_guest_state(state)
    return jsonify(state)


@garden_bp.route("/reset", methods=["POST"])
def reset_garden():
    if current_user.is_authenticated:
        current_user.total_minutes      = 0
        current_user.growth_level       = 0
        current_user.sessions_completed = 0
        db.session.commit()
        return jsonify(current_user.to_dict())

    state = _default_guest()
    _save_guest_state(state)
    return jsonify(state)


@garden_bp.route("/settings", methods=["POST"])
def save_settings():
    if not current_user.is_authenticated:
        return jsonify({"error": "Login required"}), 401
    data = request.get_json(force=True)
    for field in ("focus_minutes", "short_break_minutes", "long_break_minutes",
                  "sessions_before_long_break", "auto_start_breaks",
                  "auto_start_focus", "sound_enabled"):
        if field in data:
            setattr(current_user, field, data[field])
    db.session.commit()
    return jsonify(current_user.to_dict())


def _calc_growth(minutes):
    for i, t in enumerate([0, 25, 75, 150, 300]):
        if minutes < t:
            return i - 1
    return 4
