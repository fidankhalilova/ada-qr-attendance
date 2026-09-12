// Lightweight JSON-file-backed store. No native compilation required — this
// avoids the Python/Visual-Studio build-tools headache that native modules
// (like better-sqlite3) can cause on Windows.
//
// Performance note for scale: all reads happen against the in-memory `state`
// object (instant, never touches disk). Writes are queued and flushed to
// disk asynchronously in the background, so a burst of requests (e.g. 300
// students scanning around the same time) never blocks the event loop
// waiting on disk I/O. If you outgrow this (multiple server instances behind
// a load balancer, or need transactional guarantees), swap this file for a
// real database like Postgres — the call signatures below are simple enough
// to reimplement against any store.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'attendance.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function load() {
  if (!fs.existsSync(DB_FILE)) {
    return { sessions: {}, tokens: {}, submissions: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    return { sessions: {}, tokens: {}, submissions: {} };
  }
}

const state = load();

// --- async, serialized write queue ---
let writing = false;
let pendingWrite = false;

function scheduleSave() {
  pendingWrite = true;
  if (!writing) flush();
}

function flush() {
  writing = true;
  pendingWrite = false;
  const snapshot = JSON.stringify(state);
  fs.writeFile(DB_FILE, snapshot, (err) => {
    if (err) console.error('DB write failed:', err);
    if (pendingWrite) {
      flush(); // more changes arrived while we were writing — write again
    } else {
      writing = false;
    }
  });
}

// Flush synchronously on shutdown so nothing is lost.
function flushSync() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state));
  } catch (e) {
    console.error('Final DB flush failed:', e);
  }
}
process.on('SIGINT', () => { flushSync(); process.exit(0); });
process.on('SIGTERM', () => { flushSync(); process.exit(0); });

const db = {
  sessions: {
    create(session) {
      state.sessions[session.id] = session;
      scheduleSave();
      return session;
    },
    get(id) {
      return state.sessions[id] || null;
    },
  },

  tokens: {
    create(token) {
      state.tokens[token.token] = token;
      scheduleSave();
      return token;
    },
    get(token) {
      return state.tokens[token] || null;
    },
    latestForSession(sessionId) {
      const all = Object.values(state.tokens).filter(t => t.sessionId === sessionId);
      if (all.length === 0) return null;
      all.sort((a, b) => b.createdAt - a.createdAt);
      return all[0];
    },
    update(token, fields) {
      if (!state.tokens[token]) return null;
      Object.assign(state.tokens[token], fields);
      scheduleSave();
      return state.tokens[token];
    },
  },

  submissions: {
    // Throws Error('DUPLICATE') if (sessionId, studentId) already exists.
    insert(sub) {
      const dup = Object.values(state.submissions).some(
        s => s.sessionId === sub.sessionId && s.studentId === sub.studentId
      );
      if (dup) throw new Error('DUPLICATE');
      state.submissions[sub.id] = sub;
      scheduleSave();
      return sub;
    },
    forSession(sessionId) {
      return Object.values(state.submissions)
        .filter(s => s.sessionId === sessionId)
        .sort((a, b) => a.createdAt - b.createdAt);
    },
    countForSession(sessionId) {
      return this.forSession(sessionId).length;
    },
    recentForSession(sessionId, n) {
      return this.forSession(sessionId).slice(-n).reverse();
    },
  },
};

module.exports = db;
