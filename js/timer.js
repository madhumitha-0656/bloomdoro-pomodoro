// timer.js — Pomodoro timer logic

export class PomodoroTimer {
  constructor({ onTick, onComplete, onModeChange }) {
    this.onTick = onTick;
    this.onComplete = onComplete;
    this.onModeChange = onModeChange;

    this.settings = {
      focus_minutes: 25,
      short_break_minutes: 5,
      long_break_minutes: 15,
      sessions_before_long_break: 4,
      auto_start_breaks: false,
      auto_start_focus: false,
      sound_enabled: true,
    };

    this.mode = "focus";         // focus | short | long
    this.sessionsCompleted = 0;
    this.totalMinutes = 0;
    this._interval = null;
    this._remaining = 0;
    this._total = 0;
    this.running = false;

    this._loadSettings();
    this._reset();
  }

  // ── Public API ─────────────────────────────

  start() {
    if (this.running) return;
    this.running = true;
    this._interval = setInterval(() => this._tick(), 1000);
  }

  pause() {
    this.running = false;
    clearInterval(this._interval);
  }

  toggle() {
    this.running ? this.pause() : this.start();
    return this.running;
  }

  reset() {
    this.pause();
    this._reset();
    this.onTick(this._remaining, this._total, this.mode);
  }

  skipToNext() {
    this.pause();
    this._advance();
  }

  setMode(mode) {
    this.pause();
    this.mode = mode;
    this._reset();
    this.onModeChange(mode);
    this.onTick(this._remaining, this._total, mode);
  }

  applySettings(s) {
    Object.assign(this.settings, s);
    this._saveSettings();
    this.reset();
  }

  getDurationFor(mode) {
    const m = {
      focus: this.settings.focus_minutes,
      short: this.settings.short_break_minutes,
      long:  this.settings.long_break_minutes,
    };
    return m[mode] * 60;
  }

  // ── Private ────────────────────────────────

  _tick() {
    this._remaining--;
    this.onTick(this._remaining, this._total, this.mode);
    if (this._remaining <= 0) {
      this._complete();
    }
  }

  _complete() {
    this.pause();
    this._playSound();

    if (this.mode === "focus") {
      this.sessionsCompleted++;
      this.totalMinutes += this.settings.focus_minutes;
      this.onComplete({
        type: "focus",
        sessionsCompleted: this.sessionsCompleted,
        totalMinutes: this.totalMinutes,
      });
      this._advance();
    } else {
      this.onComplete({ type: this.mode });
      this._advance();
    }
  }

  _advance() {
    if (this.mode === "focus") {
      const isLong = this.sessionsCompleted % this.settings.sessions_before_long_break === 0;
      this.mode = isLong ? "long" : "short";
    } else {
      this.mode = "focus";
    }
    this._reset();
    this.onModeChange(this.mode);
    this.onTick(this._remaining, this._total, this.mode);

    const autoStart = this.mode === "focus"
      ? this.settings.auto_start_focus
      : this.settings.auto_start_breaks;
    if (autoStart) setTimeout(() => this.start(), 800);
  }

  _reset() {
    this._total = this.getDurationFor(this.mode);
    this._remaining = this._total;
  }

  _playSound() {
    if (!this.settings.sound_enabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const notes = this.mode === "focus" ? [523, 659, 784] : [784, 659, 523];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.22);
        gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.22 + 0.05);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.22 + 0.3);
        osc.start(ctx.currentTime + i * 0.22);
        osc.stop(ctx.currentTime + i * 0.22 + 0.35);
      });
    } catch (_) {}
  }

  _saveSettings() {
    localStorage.setItem("bloomdoro-settings", JSON.stringify(this.settings));
  }

  _loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem("bloomdoro-settings") || "null");
      if (saved) Object.assign(this.settings, saved);
    } catch (_) {}
  }
}

// ── Helpers ────────────────────────────────────────────────────────────
export function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function calcRingOffset(remaining, total, radius = 96) {
  const circumference = 2 * Math.PI * radius;
  const fraction = remaining / total;
  return circumference * (1 - fraction);
}
