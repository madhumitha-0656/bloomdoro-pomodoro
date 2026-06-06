from flask import Blueprint, request, jsonify, session

garden_bp = Blueprint("garden", __name__)

# In-memory store (replace with DB for production)
_garden_state = {}

def get_user_id():
    if "user_id" not in session:
        session["user_id"] = f"guest_{id(session)}"
    return session["user_id"]


@garden_bp.route("/state", methods=["GET"])
def get_state():
    uid = get_user_id()
    state = _garden_state.get(uid, _default_state())
    return jsonify(state)


@garden_bp.route("/state", methods=["POST"])
def update_state():
    uid = get_user_id()
    data = request.get_json(force=True)
    if uid not in _garden_state:
        _garden_state[uid] = _default_state()
    _garden_state[uid].update(data)
    return jsonify(_garden_state[uid])


@garden_bp.route("/add-time", methods=["POST"])
def add_time():
    uid = get_user_id()
    data = request.get_json(force=True)
    minutes = int(data.get("minutes", 0))
    if uid not in _garden_state:
        _garden_state[uid] = _default_state()
    state = _garden_state[uid]
    state["total_minutes"] += minutes
    state["growth_level"] = _calc_growth(state["total_minutes"])
    state["sessions_completed"] += 1
    return jsonify(state)


@garden_bp.route("/reset", methods=["POST"])
def reset_garden():
    uid = get_user_id()
    _garden_state[uid] = _default_state()
    return jsonify(_garden_state[uid])


@garden_bp.route("/select-theme", methods=["POST"])
def select_theme():
    uid = get_user_id()
    data = request.get_json(force=True)
    theme = data.get("theme", "flower")
    if uid not in _garden_state:
        _garden_state[uid] = _default_state()
    _garden_state[uid]["theme"] = theme
    return jsonify(_garden_state[uid])


def _default_state():
    return {
        "theme": "flower",
        "total_minutes": 0,
        "growth_level": 0,
        "sessions_completed": 0,
    }


def _calc_growth(minutes):
    # 0-4 growth stages based on minutes studied
    if minutes < 25:
        return 0
    elif minutes < 75:
        return 1
    elif minutes < 150:
        return 2
    elif minutes < 300:
        return 3
    else:
        return 4
