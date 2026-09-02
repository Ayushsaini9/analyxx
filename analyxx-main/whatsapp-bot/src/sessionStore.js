/**
 * ANALYXX WhatsApp Bot — Session Store
 *
 * In-memory store tracking per-user conversation state for multi-step flows.
 * Sessions auto-expire after 30 minutes of inactivity.
 *
 * Session shape:
 *   { examId, examName, subject, year, step, lastActivity }
 *
 * Steps: "idle" → "awaiting_subject" → "awaiting_year" → "idle"
 */

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

class SessionStore {
  constructor() {
    /** @type {Map<string, object>} phone → session */
    this.sessions = new Map();

    // Cleanup expired sessions every 5 minutes
    setInterval(() => this._cleanup(), 5 * 60 * 1000);
  }

  get(phone) {
    const session = this.sessions.get(phone);
    if (!session) return null;
    if (Date.now() - session.lastActivity > SESSION_TTL_MS) {
      this.sessions.delete(phone);
      return null;
    }
    session.lastActivity = Date.now();
    return session;
  }

  set(phone, data) {
    this.sessions.set(phone, {
      ...data,
      lastActivity: Date.now(),
    });
  }

  update(phone, partial) {
    const existing = this.get(phone) || {};
    this.set(phone, { ...existing, ...partial });
  }

  clear(phone) {
    this.sessions.delete(phone);
  }

  _cleanup() {
    const now = Date.now();
    for (const [phone, session] of this.sessions) {
      if (now - session.lastActivity > SESSION_TTL_MS) {
        this.sessions.delete(phone);
      }
    }
  }
}

module.exports = new SessionStore();
