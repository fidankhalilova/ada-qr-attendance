// Central place for tunable settings. Everything can be overridden with
// environment variables when deploying, without touching code.

module.exports = {
  // How long each QR code stays "current" on the classroom screen.
  TOKEN_ACTIVE_SECONDS: Number(process.env.TOKEN_ACTIVE_SECONDS) || 30,

  // How long a student has to finish the form after scanning, even if the
  // QR on screen has since rotated to a new code.
  SCAN_GRACE_SECONDS: Number(process.env.SCAN_GRACE_SECONDS) || 120,

  PORT: process.env.PORT || 3000,

  // Set this to your real domain when deployed, e.g. https://attendance.yourschool.edu
  // Falls back to whatever host/protocol the request came in on (fine for local dev).
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || null,

  // Max /api/submit requests allowed per IP per minute. Generous enough that
  // a burst of real students on shared WiFi won't be affected, but blocks
  // scripted spam. Tune with SUBMIT_RATE_LIMIT_PER_MIN if needed.
  SUBMIT_RATE_LIMIT_PER_MIN: Number(process.env.SUBMIT_RATE_LIMIT_PER_MIN) || 2000,
};
