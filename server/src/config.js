module.exports = {
  TOKEN_ACTIVE_SECONDS: Number(process.env.TOKEN_ACTIVE_SECONDS) || 30,

  SCAN_GRACE_SECONDS: Number(process.env.SCAN_GRACE_SECONDS) || 120,

  PORT: process.env.PORT || 3000,

  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || null,

  SUBMIT_RATE_LIMIT_PER_MIN: Number(process.env.SUBMIT_RATE_LIMIT_PER_MIN) || 2000,
};
