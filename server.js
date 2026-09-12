const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const config = require('./src/config');
const registerSessionRoutes = require('./src/routes/sessions');
const registerAttendanceRoutes = require('./src/routes/attendance');

const app = express();

// Behind a reverse proxy (Render/Railway/Nginx) so req.ip reflects the real
// client IP instead of the proxy's. Trusting exactly 1 hop (not `true`,
// which trusts an unlimited chain and lets anyone spoof their IP via
// headers, defeating rate limiting) — adjust this number if you put more
// than one proxy in front of the app.
app.set('trust proxy', 1);

// Security headers. CSP is disabled because the student form uses a small
// inline <script> for the fetch-based submit — fine for this app's scope,
// but tighten this if you add more complex front-end code later.
app.use(helmet({ contentSecurityPolicy: false }));

// Gzip responses — meaningful once hundreds of phones are loading the same
// small HTML/CSS/JS repeatedly during a class session.
app.use(compression());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve the built React app (run `npm run build` inside client/ first).
const clientDist = path.join(__dirname, 'client', 'dist');
app.use(express.static(clientDist));

// Rate-limit only the submission endpoint. Generous enough that a real burst
// of students on shared classroom WiFi won't be affected, but blocks
// scripted/automated spam attempts.
const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.SUBMIT_RATE_LIMIT_PER_MIN,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/submit', submitLimiter);

registerSessionRoutes(app);
registerAttendanceRoutes(app);

// Client-side routing fallback: any non-API request that didn't match a
// static file gets the React app, which handles the route (/, /instructor,
// /display, /s/:token) itself via react-router.
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(config.PORT, () => {
  console.log(`Attendance app running at http://localhost:${config.PORT}`);
  console.log(`Open http://localhost:${config.PORT}/ to create a session.`);
});
