// app.js — Main controller (100% localStorage, no backend needed)
import { PomodoroTimer, formatTime, calcRingOffset } from "./timer.js";
import { Garden } from "./garden.js";

// ── DOM ───────────────────────────────────────────────────────────────────────
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
const themeCards      = document.querySelectorAll(".theme-card");
const modeTabs        = document.querySelectorAll(".mode-tab");
const timerSection    = document.querySelector(".timer-section");
const openSettings    = $("open-settings");
const closeSettings   = $("close-settings");
const settingsModal   = $("settings-modal");
const settingsBackdrop= $("settings-backdrop");
const saveSettingsBtn = $("save-settings");
const goalProgressText= $("goal-progress-text");
const goalBar         = $("goal-bar");
const weekdayRow      = $("weekday-row");
const streakCount     = $("streak-count");

// ── Constants ──────────────────────────────────────────────────────────────────
const MODE_LABELS  = { focus:"Focus Time", short:"Short Break", long:"Long Break" };
const LEVEL_NAMES  = ["Seedling","Sprout","Bloomer","Flourishing","Legendary"];
const DAY_NAMES    = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ── Storage keys ───────────────────────────────────────────────────────────────
const KEY_DAILY_LOG  = "bloomdoro-daily-log";   // { "YYYY-MM-DD": minutes }
const KEY_GOAL       = "bloomdoro-daily-goal";   // number (minutes)
const KEY_SESSIONS   = "bloomdoro-total-sessions";

// ── Daily log helpers ─────────────────────────────────────────────────────────
function todayKey() {
  return new Date().toISOString().slice(0, 10);   // "2026-06-18"
}

function getLog() {
  try { return JSON.parse(localStorage.getItem(KEY_DAILY_LOG) || "{}"); } catch { return {}; }
}

function logMinutes(n) {
  const log = getLog();
  const key = todayKey();
  log[key] = (log[key] || 0) + n;
  localStorage.setItem(KEY_DAILY_LOG, JSON.stringify(log));
  return log[key];
}

function getTodayMinutes() {
  return getLog()[todayKey()] || 0;
}

function getGoal() {
  return parseInt(localStorage.getItem(KEY_GOAL) || "50", 10);
}

function setGoal(n) {
  localStorage.setItem(KEY_GOAL, n);
}

// ── Streak calculation ────────────────────────────────────────────────────────
// Returns how many consecutive days (including today if studied) have log entries.
function calcStreak() {
  const log  = getLog();
  let streak = 0;
  const d    = new Date();
  // Check today first, if no entry today start from yesterday
  const todayHasEntry = !!log[todayKey()];
  if (!todayHasEntry) d.setDate(d.getDate() - 1); // start streak check from yesterday

  for (let i = 0; i < 365; i++) {
    const key = d.toISOString().slice(0, 10);
    if (log[key]) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

// ── Weekly display (Mon → Sun for current week) ───────────────────────────────
function buildWeekRow() {
  weekdayRow.innerHTML = "";
  const log   = getLog();
  const today = new Date();
  // Start from Monday of current week
  const dayOfWeek = today.getDay(); // 0=Sun
  const monday    = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7)); // shift to Monday

  for (let i = 0; i < 7; i++) {
    const d      = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key    = d.toISOString().slice(0, 10);
    const mins   = log[key] || 0;
    const isToday = key === todayKey();
    const studied = mins > 0;
    const goal   = getGoal();
    const goalMet = mins >= goal;

    const chip = document.createElement("div");
    chip.className = "day-chip" +
      (studied  ? " studied"  : "") +
      (isToday  ? " today"    : "") +
      (goalMet  ? " goal-met" : "");

    chip.innerHTML = `
      <span class="day-name">${DAY_NAMES[d.getDay()]}</span>
      <span class="day-check">${goalMet ? "✓" : studied ? "·" : ""}</span>
      <span class="day-mins">${mins > 0 ? mins+"m" : ""}</span>
    `;
    weekdayRow.appendChild(chip);
  }
}

// ── Goal bar update ───────────────────────────────────────────────────────────
function updateGoalBar() {
  const mins   = getTodayMinutes();
  const goal   = getGoal();
  const pct    = Math.min((mins / goal) * 100, 100);
  goalBar.style.width = `${pct}%`;
  goalProgressText.textContent = `${mins} / ${goal} min`;
  if (pct >= 100) goalBar.classList.add("goal-complete");
  else            goalBar.classList.remove("goal-complete");
}

// ── SVG ring gradient ─────────────────────────────────────────────────────────
function injectSVGDefs() {
  const svg  = document.querySelector(".clock-ring");
  const defs = document.createElementNS("http://www.w3.org/2000/svg","defs");
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
  ringProgress.setAttribute("stroke","url(#ring-gradient)");
}

// ── Particles ─────────────────────────────────────────────────────────────────
function initParticles() {
  const canvas = $("particle-canvas");
  const ctx    = canvas.getContext("2d");
  let W, H, particles;
  const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
  const spawn  = () => { particles = Array.from({length:55},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.8+0.4,vx:(Math.random()-.5)*.25,vy:(Math.random()-.5)*.25,alpha:Math.random()*.5+.15,hue:Math.random()>.5?270:160})); };
  const draw   = () => { ctx.clearRect(0,0,W,H); for(const p of particles){ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`hsla(${p.hue},70%,75%,${p.alpha})`;ctx.fill();p.x+=p.vx;p.y+=p.vy;if(p.x<0)p.x=W;if(p.x>W)p.x=0;if(p.y<0)p.y=H;if(p.y>H)p.y=0;} requestAnimationFrame(draw); };
  resize(); spawn(); draw();
  window.addEventListener("resize",()=>{resize();spawn();});
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(message, type="info", duration=3500) {
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = message;
  toastContainer.appendChild(t);
  setTimeout(()=>{ t.style.opacity="0"; t.style.transform="translateX(20px)"; setTimeout(()=>t.remove(),400); }, duration);
}

// ── Session dots ──────────────────────────────────────────────────────────────
function renderSessionDots(timer) {
  const total = timer.settings.sessions_before_long_break;
  const done  = timer.sessionsCompleted % total;
  sessionDotsEl.innerHTML = "";
  for (let i = 0; i < total; i++) {
    const d = document.createElement("div");
    d.className = "session-dot";
    if (i < done)                                  d.classList.add("complete");
    else if (i === done && timer.mode === "focus")  d.classList.add("current");
    sessionDotsEl.appendChild(d);
  }
}

// ── Mode theming ──────────────────────────────────────────────────────────────
function applyModeTheme(mode) {
  const gs = document.querySelector(".garden-stage");
  if (mode==="focus") { gs.classList.remove("break-mode"); ringProgress.setAttribute("stroke","url(#ring-gradient)"); }
  else               { gs.classList.add("break-mode");    ringProgress.setAttribute("stroke","url(#ring-gradient-break)"); }
  clockModeLabel.textContent = MODE_LABELS[mode];
}

// ── All stats ─────────────────────────────────────────────────────────────────
function refreshStats(garden) {
  const totalSessions = parseInt(localStorage.getItem(KEY_SESSIONS) || "0", 10);
  statSessions.textContent = totalSessions;
  statMinutes.textContent  = garden.getTotalMinutes();
  statStreak.textContent   = calcStreak();
  statLevel.textContent    = LEVEL_NAMES[garden.getLevel()] ?? "Legendary";
  updateGoalBar();
  buildWeekRow();
  streakCount.textContent  = `${calcStreak()} day streak`;
}

// ── Settings modal ────────────────────────────────────────────────────────────
function openSettingsModal(timer) {
  const s = timer.settings;
  $("s-focus").value    = s.focus_minutes;
  $("s-short").value    = s.short_break_minutes;
  $("s-long").value     = s.long_break_minutes;
  $("s-sessions").value = s.sessions_before_long_break;
  $("s-goal").value     = getGoal();
  $("s-auto-break").checked = s.auto_start_breaks;
  $("s-auto-focus").checked = s.auto_start_focus;
  $("s-sound").checked      = s.sound_enabled;
  settingsModal.classList.remove("hidden");
}
function closeSettingsModal() { settingsModal.classList.add("hidden"); }
function saveSettings(timer, garden) {
  timer.applySettings({
    focus_minutes:              parseInt($("s-focus").value),
    short_break_minutes:        parseInt($("s-short").value),
    long_break_minutes:         parseInt($("s-long").value),
    sessions_before_long_break: parseInt($("s-sessions").value),
    auto_start_breaks: $("s-auto-break").checked,
    auto_start_focus:  $("s-auto-focus").checked,
    sound_enabled:     $("s-sound").checked,
  });
  setGoal(parseInt($("s-goal").value) || 50);
  closeSettingsModal();
  showToast("Settings saved! 🎉","success");
  renderSessionDots(timer);
  refreshStats(garden);
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
function init() {
  injectSVGDefs();
  initParticles();

  // ── Garden ──
  const garden = new Garden(gardenEntity, growthLabel, xpBar);

  // Sync active theme card
  themeCards.forEach(c => c.classList.toggle("active", c.dataset.theme === garden.theme));

  // ── Timer ──
  let minutesThisSession = 0;  // track minutes credited during current session

  const timer = new PomodoroTimer({
    onTick(remaining, total) {
      clockDisplay.textContent = formatTime(remaining);
      document.title = `${formatTime(remaining)} — Bloomdoro`;
      ringProgress.style.strokeDashoffset = calcRingOffset(remaining, total);

      // Grow garden every completed minute during focus
      if (timer.mode === "focus" && timer.running) {
        const elapsed = total - remaining;          // seconds elapsed
        const minutesDone = Math.floor(elapsed / 60);
        if (minutesDone > minutesThisSession) {
          // A new minute just completed — grow by 1
          minutesThisSession = minutesDone;
          logMinutes(1);
          garden.addMinutes(1);
          refreshStats(garden);
        }
      }
    },
    onComplete({ type }) {
      if (type === "focus") {
        // Credit any remaining seconds as a final minute
        const totalMins = timer.settings.focus_minutes;
        const remaining = totalMins - minutesThisSession;
        if (remaining > 0) { logMinutes(remaining); garden.addMinutes(remaining); }
        minutesThisSession = 0;

        const prev = parseInt(localStorage.getItem(KEY_SESSIONS) || "0", 10);
        localStorage.setItem(KEY_SESSIONS, prev + 1);
        refreshStats(garden);
        renderSessionDots(timer);

        const todayTotal = getTodayMinutes();
        const goal = getGoal();
        if (todayTotal >= goal && todayTotal - totalMins < goal) {
          showToast("🎯 Daily goal reached! Amazing focus!", "success", 5000);
        } else {
          showToast("🍅 Focus session done! Keep it up.", "success");
        }
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

  // Init display
  clockDisplay.textContent = formatTime(timer.getDurationFor("focus"));
  ringProgress.style.strokeDasharray  = "603";
  ringProgress.style.strokeDashoffset = "0";
  renderSessionDots(timer);
  refreshStats(garden);

  // ── Timer controls ──
  btnStart.addEventListener("click", () => {
    const running = timer.toggle();
    timerSection.classList.toggle("timer-running", running);
    btnStart.textContent = running ? "Pause" : "Resume";
  });
  btnReset.addEventListener("click", () => {
    timer.reset();
    minutesThisSession = 0;
    btnStart.textContent = "Start";
    timerSection.classList.remove("timer-running");
  });
  btnSkip.addEventListener("click", () => {
    timer.skipToNext();
    minutesThisSession = 0;
    btnStart.textContent = "Start";
    timerSection.classList.remove("timer-running");
  });

  // ── Mode tabs ──
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

  // ── Theme cards ──
  themeCards.forEach(card => {
    card.addEventListener("click", () => {
      themeCards.forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      garden.setTheme(card.dataset.theme);
    });
  });

  // ── Settings ──
  openSettings.addEventListener("click",     () => openSettingsModal(timer));
  closeSettings.addEventListener("click",    closeSettingsModal);
  settingsBackdrop.addEventListener("click", closeSettingsModal);
  saveSettingsBtn.addEventListener("click",  () => saveSettings(timer, garden));

  // ── Keyboard shortcuts ──
  document.addEventListener("keydown", e => {
    if (e.target.tagName === "INPUT") return;
    if (e.code === "Space") { e.preventDefault(); btnStart.click(); }
    if (e.code === "KeyR")  timer.reset();
    if (e.code === "KeyS")  openSettingsModal(timer);
  });

  // Refresh weekday row at midnight
  const msUntilMidnight = () => {
    const n = new Date(); const m = new Date(n); m.setHours(24,0,0,0); return m-n;
  };
  setTimeout(() => { buildWeekRow(); updateGoalBar(); }, msUntilMidnight());
}

document.addEventListener("DOMContentLoaded", init);
