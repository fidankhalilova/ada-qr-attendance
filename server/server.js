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

app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));

app.use(compression());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.SUBMIT_RATE_LIMIT_PER_MIN,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/submit', submitLimiter);

registerSessionRoutes(app);
registerAttendanceRoutes(app);

app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(config.PORT, () => {
  console.log(`Attendance app running at http://localhost:${config.PORT}`);
  console.log(`Open http://localhost:${config.PORT}/ to create a session.`);
});
