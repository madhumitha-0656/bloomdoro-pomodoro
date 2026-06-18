// spotify.js — Spotify widget controller

const API = "/api/spotify";

export class SpotifyController {
  constructor({ onConnect, onDisconnect, onTrackChange }) {
    this.onConnect     = onConnect;
    this.onDisconnect  = onDisconnect;
    this.onTrackChange = onTrackChange;
    this.connected     = false;
    this._pollInterval = null;
  }

  async init() {
    const status = await this._get("/status");
    if (status?.connected) {
      this.connected = true;
      this.onConnect(status.display_name);
      this._startPolling();
    }
  }

  async connect() {
    window.location.href = `${API}/login`;
  }

  async disconnect() {
    await this._post("/disconnect");
    this.connected = false;
    this._stopPolling();
    this.onDisconnect();
  }

  async play()  { await this._put("/play"); }
  async pause() { await this._put("/pause"); }
  async next()  { await this._post("/next"); }

  async togglePlayback(isPlaying) {
    if (isPlaying) await this.pause();
    else           await this.play();
  }

  // ── Polling ────────────────────────────────

  _startPolling() {
    this._fetchNowPlaying();
    this._pollInterval = setInterval(() => this._fetchNowPlaying(), 5000);
  }

  _stopPolling() {
    clearInterval(this._pollInterval);
  }

  async _fetchNowPlaying() {
    const data = await this._get("/now-playing");
    if (data) this.onTrackChange(data);
  }

  // ── HTTP helpers ───────────────────────────

  async _get(path) {
    try {
      const r = await fetch(`${API}${path}`, { credentials: "include" });
      return r.ok ? r.json() : null;
    } catch { return null; }
  }

  async _post(path) {
    try {
      await fetch(`${API}${path}`, { method: "POST", credentials: "include" });
    } catch {}
  }

  async _put(path) {
    try {
      await fetch(`${API}${path}`, { method: "PUT", credentials: "include" });
    } catch {}
  }
}
