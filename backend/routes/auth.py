import os
from flask import Blueprint, redirect, url_for, session, jsonify, request
from flask_login import login_user, logout_user, current_user, login_required
from authlib.integrations.flask_client import OAuth
from models.user import db, User
from config import Config

auth_bp = Blueprint("auth", __name__)
oauth    = OAuth()


def init_oauth(app):
    oauth.init_app(app)
    oauth.register(
        name="google",
        client_id=Config.GOOGLE_CLIENT_ID,
        client_secret=Config.GOOGLE_CLIENT_SECRET,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )


@auth_bp.route("/google")
def google_login():
    if not Config.GOOGLE_CLIENT_ID:
        return jsonify({"error": "Google OAuth not configured"}), 503
    redirect_uri = url_for("auth.google_callback", _external=True)
    return oauth.google.authorize_redirect(redirect_uri)


@auth_bp.route("/google/callback")
def google_callback():
    try:
        token = oauth.google.authorize_access_token()
        info  = token.get("userinfo") or oauth.google.userinfo()
    except Exception as exc:
        return redirect("/?auth_error=true")

    google_id = info["sub"]
    user = User.query.get(google_id)

    if user is None:
        user = User(
            id     = google_id,
            email  = info.get("email", ""),
            name   = info.get("name", "User"),
            avatar = info.get("picture", ""),
        )
        db.session.add(user)
    else:
        user.name   = info.get("name", user.name)
        user.avatar = info.get("picture", user.avatar)

    db.session.commit()
    login_user(user, remember=True)
    return redirect("/?logged_in=true")


@auth_bp.route("/logout", methods=["POST"])
def logout():
    logout_user()
    return jsonify({"status": "logged_out"})


@auth_bp.route("/me")
def me():
    if current_user.is_authenticated:
        return jsonify({"logged_in": True, "user": current_user.to_dict()})
    return jsonify({"logged_in": False})
