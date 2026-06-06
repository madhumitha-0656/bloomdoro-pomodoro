// app.js — Main application controller
import { PomodoroTimer, formatTime, calcRingOffset } from "./timer.js";
import { Garden } from "./garden.js";
import { SpotifyController } from "./spotify.js";

// ── DOM refs ──────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const clockDisplay    = $("clock-display");
const clockModeLabel  = $("clock-mode-label");
const ringProgress    = $("ring-progress");
const btnStart        = $("btn-start");
const btnReset        = $("btn-reset");
const btnSkip         = $("btn-skip");
const sessionDotsEl   = $("session-dots");
const statSessions    = $("stat-sessions");
const statMinutes     = $("stat-minutes");
const statStreak      = $("stat-streak");
const statLevel       = $("stat-level");
const growthLabel     = $("growth-label");
const xpBar           = $("xp-bar");
const gardenEntity    = $("garden-entity");
const toastContainer  = $("toast-container");
const openSettings    = $("open-settings");
const closeSettings   = $("close-settings");
const settingsModal   = $("settings-modal");
const settingsBackdrop= $("settings-backdrop");
const saveSettingsBtn = $("save-settings");
const themeCards      = document.querySelectorAll(".theme-card");
const modeTabs        = document.querySelectorAll(".mode-tab");
const timerSection    = document.querySelector(".timer-section");
const spotifyConnectBtn = $("spotify-connect-btn");
const spotifyPlayer   = $("spotify-player");
const spPlay          = $("sp-play");
const spNext          = $("sp-next");
const spDisconnect    = $("sp-disconnect");
const albumArt        = $("album-art");
const trackName       = $("track-name");
const trackArtist     = $("track-artist");

// ── Mode labels ────────────────────────────────────────────────────────────
const MODE_LABELS = { focus: "Focus Time", short: "Short Break", long: "Long Break" };

// ── Ring gradient (injected SVG defs) ─────────────────────────────────────
function injectSVGDefs() {
  const svg = document.querySelector(".clock-ring");
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.innerHTML = `
    <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#ec4899"/>
    </linearGradient>
    <linearGradient id="ring-gradient-break" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#10b981"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>`;
  svg.insertBefore(defs, svg.firstChild);
  ringProgress.setAttribute("stroke", "url(#ring-gradient)");
}

// ── Particle background ────────────────────────────────────────────────────
function initParticles() {
  const canvas = $("particle-canvas");
  const ctx    = canvas.getContext("2d");
  let W, H, particles;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function spawn() {
    particles = Array.from({ length: 55 }, () => ({
      x:    Math.random() * (W || 1200),
      y:    Math.random() * (H || 800),
      r:    Math.random() * 1.8 + 0.4,
      vx:   (Math.random() - 0.5) * 0.25,
      vy:   (Math.random() - 0.5) * 0.25,
      alpha: Math.random() * 0.5 + 0.15,
      hue:  Math.random() > 0.5 ? 270 : 160,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 70%, 75%, ${p.alpha})`;
      ctx.fill();
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;
    }
    requestAnimationFrame(draw);
  }

  resize();
  spawn();
  draw();
  window.addEventListener("resize", () => { resize(); spawn(); });
}

// ── Toast ──────────────────────────────────────────────────────────────────
function showToast(message, type = "info", duration = 3500) {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = "opacity 0.4s, transform 0.4s";
    toast.style.opacity = "0";
    toast.style.transform = "translateX(20px)";
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

// ── Session dots ───────────────────────────────────────────────────────────
function renderSessionDots(timer) {
  const total   = timer.settings.sessions_before_long_break;
  const done    = timer.sessionsCompleted % total;
  sessionDotsEl.innerHTML = "";
  for (let i = 0; i < total; i++) {
    const d = document.createElement("div");
    d.className = "session-dot";
    if (i < done) d.classList.add("complete");
    else if (i === done && timer.mode === "focus") d.classList.add("current");
    sessionDotsEl.appendChild(d);
  }
}

// ── Level names ────────────────────────────────────────────────────────────
const LEVEL_NAMES = ["Seedling", "Sprout", "Bloomer", "Flourishing", "Legendary"];

// ── Stats update ───────────────────────────────────────────────────────────
function updateStats(timer, garden) {
  statSessions.textContent = timer.sessionsCompleted;
  statMinutes.textContent  = garden.getTotalMinutes();
  statLevel.textContent    = LEVEL_NAMES[garden.getLevel()] ?? "Legendary";
  updateStreak();
}

function updateStreak() {
  const today = new Date().toDateString();
  const last  = localStorage.getItem("bloomdoro-last-session");
  let streak  = parseInt(localStorage.getItem("bloomdoro-streak") || "0", 10);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (last === today) {
    // already studied today — keep streak
  } else if (last === yesterday.toDateString()) {
    streak++;
    localStorage.setItem("bloomdoro-streak", streak);
    localStorage.setItem("bloomdoro-last-session", today);
  } else if (!last) {
    streak = 1;
    localStorage.setItem("bloomdoro-streak", streak);
    localStorage.setItem("bloomdoro-last-session", today);
  } else {
    // streak broken
    streak = 1;
    localStorage.setItem("bloomdoro-streak", streak);
    localStorage.setItem("bloomdoro-last-session", today);
  }
  statStreak.textContent = streak;
}

// ── Settings modal ─────────────────────────────────────────────────────────
function openSettingsModal(timer) {
  const s = timer.settings;
  $("s-focus").value    = s.focus_minutes;
  $("s-short").value    = s.short_break_minutes;
  $("s-long").value     = s.long_break_minutes;
  $("s-sessions").value = s.sessions_before_long_break;
  $("s-auto-break").checked = s.auto_start_breaks;
  $("s-auto-focus").checked = s.auto_start_focus;
  $("s-sound").checked  = s.sound_enabled;
  settingsModal.classList.remove("hidden");
}

function closeSettingsModal() {
  settingsModal.classList.add("hidden");
}

function saveSettings(timer) {
  timer.applySettings({
    focus_minutes:              parseInt($("s-focus").value),
    short_break_minutes:        parseInt($("s-short").value),
    long_break_minutes:         parseInt($("s-long").value),
    sessions_before_long_break: parseInt($("s-sessions").value),
    auto_start_breaks: $("s-auto-break").checked,
    auto_start_focus:  $("s-auto-focus").checked,
    sound_enabled:     $("s-sound").checked,
  });
  closeSettingsModal();
  showToast("Settings saved! 🎉", "success");
  renderSessionDots(timer);
}

// ── Break mode theming ─────────────────────────────────────────────────────
function applyModeTheme(mode) {
  const gardenStage = document.querySelector(".garden-stage");
  if (mode === "focus") {
    gardenStage.classList.remove("break-mode");
    ringProgress.setAttribute("stroke", "url(#ring-gradient)");
  } else {
    gardenStage.classList.add("break-mode");
    ringProgress.setAttribute("stroke", "url(#ring-gradient-break)");
  }
  clockModeLabel.textContent = MODE_LABELS[mode];
}

// ── Main init ─────────────────────────────────────────────────────────────
async function init() {
  injectSVGDefs();
  initParticles();

  // Garden
  const garden = new Garden(gardenEntity, growthLabel, xpBar);

  // Timer
  const timer = new PomodoroTimer({
    onTick(remaining, total, mode) {
      clockDisplay.textContent = formatTime(remaining);
      document.title = `${formatTime(remaining)} — Bloomdoro`;
      const offset = calcRingOffset(remaining, total);
      ringProgress.style.strokeDashoffset = offset;
    },
    onComplete({ type, sessionsCompleted, totalMinutes }) {
      if (type === "focus") {
        const leveled = garden.addMinutes(timer.settings.focus_minutes);
        updateStats(timer, garden);
        showToast(leveled
          ? `✨ You leveled up! Keep going!`
          : `🍅 Focus session complete! Great work.`, "success");
        renderSessionDots(timer);
      } else {
        showToast("☕ Break over — ready to focus again?", "info");
      }
    },
    onModeChange(mode) {
      modeTabs.forEach(t => t.classList.toggle("active", t.dataset.mode === mode));
      applyModeTheme(mode);
      timerSection.classList.remove("timer-running");
      btnStart.textContent = "Start";
    },
  });

  // Initial render
  clockDisplay.textContent = formatTime(timer.getDurationFor("focus"));
  ringProgress.style.strokeDasharray  = "603";
  ringProgress.style.strokeDashoffset = "0";
  renderSessionDots(timer);
  updateStats(timer, garden);

  // ── Timer controls ──────────────────────────────
  btnStart.addEventListener("click", () => {
    const running = timer.toggle();
    btnStart.textContent = running ? "Pause" : "Resume";
    timerSection.classList.toggle("timer-running", running);
    if (!running) btnStart.textContent = "Resume";
  });

  btnReset.addEventListener("click", () => {
    timer.reset();
    btnStart.textContent = "Start";
    timerSection.classList.remove("timer-running");
  });

  btnSkip.addEventListener("click", () => {
    timer.skipToNext();
    btnStart.textContent = "Start";
    timerSection.classList.remove("timer-running");
  });

  // ── Mode tabs ───────────────────────────────────
  modeTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      modeTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      timer.setMode(tab.dataset.mode);
      applyModeTheme(tab.dataset.mode);
      btnStart.textContent = "Start";
      timerSection.classList.remove("timer-running");
    });
  });

  // ── Theme cards ─────────────────────────────────
  themeCards.forEach(card => {
    card.addEventListener("click", () => {
      themeCards.forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      garden.setTheme(card.dataset.theme);
    });
  });
  // Sync active card to saved theme
  themeCards.forEach(c => c.classList.toggle("active", c.dataset.theme === garden.theme));

  // ── Settings ────────────────────────────────────
  openSettings.addEventListener("click",    () => openSettingsModal(timer));
  closeSettings.addEventListener("click",   closeSettingsModal);
  settingsBackdrop.addEventListener("click", closeSettingsModal);
  saveSettingsBtn.addEventListener("click", () => saveSettings(timer));

  // ── Spotify ─────────────────────────────────────
  let nowPlaying = false;

  const spotify = new SpotifyController({
    onConnect(displayName) {
      spotifyConnectBtn.classList.add("hidden");
      spotifyPlayer.classList.remove("hidden");
      showToast(`🎵 Spotify connected${displayName ? ` — ${displayName}` : ""}`, "success");
    },
    onDisconnect() {
      spotifyConnectBtn.classList.remove("hidden");
      spotifyPlayer.classList.add("hidden");
      showToast("Spotify disconnected", "info");
    },
    onTrackChange(data) {
      nowPlaying = data.playing;
      trackName.textContent   = data.track_name || "—";
      trackArtist.textContent = data.artist     || "—";
      if (data.album_art) {
        albumArt.src = data.album_art;
        albumArt.style.display = "block";
      }
      spPlay.textContent = data.playing ? "⏸" : "▶";
    },
  });

  await spotify.init();

  // Check URL params for Spotify callback result
  const params = new URLSearchParams(window.location.search);
  if (params.get("spotify_connected") === "true") {
    await spotify.init();
    window.history.replaceState({}, "", "/");
  }
  if (params.get("spotify_error") === "true") {
    showToast("Spotify connection failed. Check your credentials.", "warning");
    window.history.replaceState({}, "", "/");
  }

  spotifyConnectBtn.addEventListener("click", () => spotify.connect());
  spPlay.addEventListener("click",       () => spotify.togglePlayback(nowPlaying));
  spNext.addEventListener("click",       () => spotify.next());
  spDisconnect.addEventListener("click", () => spotify.disconnect());

  // ── Keyboard shortcuts ───────────────────────────
  document.addEventListener("keydown", e => {
    if (e.target.tagName === "INPUT") return;
    if (e.code === "Space") {
      e.preventDefault();
      btnStart.click();
    }
    if (e.code === "KeyR") timer.reset();
    if (e.code === "KeyS") openSettingsModal(timer);
  });
}

document.addEventListener("DOMContentLoaded", init);
