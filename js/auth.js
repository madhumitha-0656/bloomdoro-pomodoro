// auth.js — Google login / logout / user state

export class Auth {
  constructor({ onLogin, onLogout }) {
    this.onLogin  = onLogin;
    this.onLogout = onLogout;
    this.user     = null;
  }

  async init() {
    const data = await this._get("/auth/me");
    if (data?.logged_in) {
      this.user = data.user;
      this.onLogin(data.user);
    } else {
      this.onLogout();
    }
    return this.user;
  }

  login() {
    window.location.href = "/auth/google";
  }

  async logout() {
    await fetch("/auth/logout", { method: "POST", credentials: "include" });
    this.user = null;
    this.onLogout();
  }

  isLoggedIn() { return !!this.user; }

  async _get(path) {
    try {
      const r = await fetch(path, { credentials: "include" });
      return r.ok ? r.json() : null;
    } catch { return null; }
  }
}
