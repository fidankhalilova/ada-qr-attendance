const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const config = require('../config');
const { now, signOpenProof, verifyOpenProof } = require('../utils');

module.exports = function registerAttendanceRoutes(app) {
  // ============ STUDENT: check a scanned link (returns JSON; React renders it) ============
  //
  // Many students scan the SAME live QR code at roughly the same moment —
  // that's the normal, expected case in a real classroom — so this route
  // does not restrict a token to a single opener. The two real defenses
  // against abuse are (1) the 30-second expiry, which makes a
  // screenshotted/forwarded code useless almost immediately, and (2) the
  // Student-ID + device-cookie checks in /api/submit below.
  app.get('/api/scan/:token', (req, res) => {
    const t = now();
    const token = db.tokens.get(req.params.token);

    if (!token) return res.json({ status: 'error', message: 'This QR code is invalid.' });

    const session = db.sessions.get(token.sessionId);
    if (!session || t > session.endsAt) {
      return res.json({ status: 'error', message: 'Attendance for this class has closed.' });
    }

    const deviceCookieName = `submitted_${session.id}`;
    if (req.cookies[deviceCookieName]) {
      return res.json({ status: 'already_submitted' });
    }

    const proofCookieName = `scan_${req.params.token}`;
    const openedAt = verifyOpenProof(req.params.token, req.cookies[proofCookieName]);

    if (openedAt === null) {
      // First time this browser has opened this specific token.
      // No grace period for opening — once the code rotates, it's dead for
      // anyone who hasn't already opened it.
      if (t > token.expiresAt) {
        return res.json({ status: 'error', message: 'This QR code has expired. Please scan the current code on the screen.' });
      }
      const proof = signOpenProof(req.params.token, t);
      res.cookie(proofCookieName, proof, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: config.SCAN_GRACE_SECONDS * 1000,
      });
      return res.json({ status: 'form' });
    }

    // This browser already opened this token before — let them keep filling
    // out the form even if the QR has since rotated, as long as they're
    // still within their personal grace period.
    if (t > openedAt + config.SCAN_GRACE_SECONDS * 1000) {
      return res.json({ status: 'error', message: 'Time expired. Please scan the current QR code on the screen and try again.' });
    }
    return res.json({ status: 'form' });
  });

  // ============ STUDENT: submit attendance ============
  app.post('/api/submit', (req, res) => {
    const { token, name, surname, studentId } = req.body;
    const t = now();

    if (!token || !name || !surname || !studentId) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const tokenRow = db.tokens.get(token);
    if (!tokenRow) return res.status(400).json({ error: 'Invalid session link.' });

    const session = db.sessions.get(tokenRow.sessionId);
    if (!session || t > session.endsAt) {
      return res.status(400).json({ error: 'Attendance for this class has closed.' });
    }

    // Confirm this request really came from a browser that opened this
    // token in time (defends against directly POSTing without ever loading
    // the scan page).
    const proofCookieName = `scan_${token}`;
    const openedAt = verifyOpenProof(token, req.cookies[proofCookieName]);
    if (openedAt === null) {
      return res.status(400).json({ error: 'Please open this form by scanning the QR code again.' });
    }
    if (t > openedAt + config.SCAN_GRACE_SECONDS * 1000) {
      return res.status(400).json({ error: 'Time expired. Please scan the current QR code on the screen and try again.' });
    }

    const deviceCookieName = `submitted_${session.id}`;
    if (req.cookies[deviceCookieName]) {
      return res.status(409).json({ error: 'This device has already been used to submit attendance for this session.' });
    }

    const cleanStudentId = String(studentId).trim();
    const ip = req.ip;

    const sub = {
      id: uuidv4(),
      sessionId: session.id,
      studentId: cleanStudentId,
      name: name.trim(),
      surname: surname.trim(),
      token,
      ip,
      createdAt: t,
    };

    try {
      db.submissions.insert(sub);
    } catch (e) {
      if (e.message === 'DUPLICATE') {
        return res.status(409).json({ error: 'This Student ID has already submitted attendance for this session.' });
      }
      return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }

    res.cookie(deviceCookieName, '1', {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: Math.max(0, session.endsAt - t) + 60 * 60 * 1000,
    });
    res.json({ success: true });
  });
};
