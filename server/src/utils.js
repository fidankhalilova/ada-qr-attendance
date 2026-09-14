const crypto = require('crypto');
const config = require('./config');
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
