const crypto = require('crypto');
const config = require('./config');

// A random secret generated once per server run, used to sign proof-of-scan
// cookies (see routes/attendance.js). If the server restarts mid-session,
// students who already scanned would need to rescan — acceptable since a
// class session normally runs against one continuously-running server.
// Set COOKIE_SECRET in the environment if you want this stable across restarts.
const COOKIE_SECRET = process.env.COOKIE_SECRET || crypto.randomBytes(32).toString('hex');

function now() {
  return Date.now();
}

function genKey() {
  return crypto.randomBytes(16).toString('hex');
}

function genToken() {
  return crypto.randomBytes(12).toString('hex');
}

function baseUrl(req) {
  return config.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// --- Signed "I opened this specific QR token at time X" proof ---
// Stateless (no server-side per-browser bookkeeping needed), so it scales to
// any number of simultaneous openers of the same live QR code with zero
// added memory/storage cost.
function signOpenProof(token, openedAt) {
  const sig = crypto.createHmac('sha256', COOKIE_SECRET).update(`${token}:${openedAt}`).digest('hex');
  return `${openedAt}.${sig}`;
}

function verifyOpenProof(token, cookieValue) {
  if (!cookieValue || typeof cookieValue !== 'string') return null;
  const parts = cookieValue.split('.');
  if (parts.length !== 2) return null;
  const [openedAtStr, sig] = parts;
  const openedAt = Number(openedAtStr);
  if (!Number.isFinite(openedAt)) return null;
  const expectedSig = crypto.createHmac('sha256', COOKIE_SECRET).update(`${token}:${openedAt}`).digest('hex');
  if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return null;
  }
  return openedAt;
}

module.exports = { now, genKey, genToken, baseUrl, escapeHtml, signOpenProof, verifyOpenProof };
