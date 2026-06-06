# 🌸 Bloomdoro — Gamified Focus Pomodoro Tracker

A Pomodoro focus timer that grows virtual companions as you study — built with **Python / Flask** and **vanilla JS**.

## ✨ Features

- **6 growable companions** — Flower 🌸, Forest 🌲, Cactus 🌵, Cat 🐱, Fox 🦊, Crystal 💎
- **5 growth stages each** — companions visually grow the more you study
- **Full Pomodoro engine** — focus / short break / long break with auto-start options
- **Animated ring clock** with smooth countdown
- **XP bar + level-up celebrations**
- **Spotify integration** — connect your account to control playback while studying
- **Day streak tracker**
- **Settings modal** — customise all timer durations
- **Keyboard shortcuts** — Space (start/pause), R (reset), S (settings)

## 🗂 Project Structure

```
pomodoro-tracker/
├── backend/
│   ├── app.py           # Flask server
│   ├── config.py        # Settings & Spotify OAuth config
│   ├── routes/
│   │   ├── timer.py     # Session settings & history
│   │   ├── garden.py    # Growth state & theme selection
│   │   └── spotify.py   # Spotify OAuth + now-playing
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── css/
│   │   ├── main.css
│   │   └── animations.css
│   └── js/
│       ├── app.js
│       ├── timer.js
│       ├── garden.js
│       └── spotify.js
├── render.yaml          # One-click Render deployment
└── Procfile
```

## 🚀 Run Locally

```bash
cd backend
cp .env.example .env    # add your Spotify keys (optional)
pip install -r requirements.txt
python app.py
# Open http://localhost:5000
```

## ☁️ Deploy to Render (free)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New → Web Service**
3. Connect this repo — Render reads `render.yaml` automatically
4. Add environment variables in Render dashboard:
   - `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` (optional, for Spotify)
   - `SPOTIFY_REDIRECT_URI` → set to `https://your-app.onrender.com/api/spotify/callback`
5. Click **Deploy**

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, Flask 3.0, Gunicorn |
| Frontend | HTML5, CSS3, Vanilla JS (ES Modules) |
| Animations | Pure CSS keyframe animations |
| Hosting | Render / Railway / Heroku |
