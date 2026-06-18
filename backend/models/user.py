from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime, date, timedelta

db = SQLAlchemy()


class User(db.Model, UserMixin):
    __tablename__ = "users"

    id            = db.Column(db.String(128), primary_key=True)  # Google sub
    email         = db.Column(db.String(256), unique=True, nullable=False)
    name          = db.Column(db.String(256), nullable=False)
    avatar        = db.Column(db.String(512), default="")
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    # Garden
    theme             = db.Column(db.String(32),  default="flower")
    total_minutes     = db.Column(db.Integer,      default=0)
    growth_level      = db.Column(db.Integer,      default=0)
    sessions_completed= db.Column(db.Integer,      default=0)

    # Streak
    streak            = db.Column(db.Integer, default=0)
    last_session_date = db.Column(db.Date,    nullable=True)

    # Timer prefs
    focus_minutes              = db.Column(db.Integer, default=25)
    short_break_minutes        = db.Column(db.Integer, default=5)
    long_break_minutes         = db.Column(db.Integer, default=15)
    sessions_before_long_break = db.Column(db.Integer, default=4)
    auto_start_breaks          = db.Column(db.Boolean, default=False)
    auto_start_focus           = db.Column(db.Boolean, default=False)
    sound_enabled              = db.Column(db.Boolean, default=True)

    def add_focus_minutes(self, minutes: int) -> dict:
        """Add focus minutes, update streak, return updated state dict."""
        self.total_minutes += minutes
        self.sessions_completed += 1
        self.growth_level = self._calc_growth()

        today = date.today()
        yesterday = today - timedelta(days=1)

        if self.last_session_date == today:
            pass  # Already studied today — keep streak
        elif self.last_session_date == yesterday:
            self.streak += 1
        else:
            self.streak = 1  # Reset or start

        self.last_session_date = today
        return self.to_dict()

    def _calc_growth(self) -> int:
        thresholds = [0, 25, 75, 150, 300]
        for i in range(len(thresholds) - 1, -1, -1):
            if self.total_minutes >= thresholds[i]:
                return i
        return 0

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "avatar": self.avatar,
            "theme": self.theme,
            "total_minutes": self.total_minutes,
            "growth_level": self.growth_level,
            "sessions_completed": self.sessions_completed,
            "streak": self.streak,
            "last_session_date": self.last_session_date.isoformat()
                                  if self.last_session_date else None,
            "settings": {
                "focus_minutes": self.focus_minutes,
                "short_break_minutes": self.short_break_minutes,
                "long_break_minutes": self.long_break_minutes,
                "sessions_before_long_break": self.sessions_before_long_break,
                "auto_start_breaks": self.auto_start_breaks,
                "auto_start_focus": self.auto_start_focus,
                "sound_enabled": self.sound_enabled,
            }
        }
