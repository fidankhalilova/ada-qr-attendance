const crypto = require('crypto');
const QRCode = require('qrcode');
const ExcelJS = require('exceljs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const config = require('../config');
const { now, genKey, genToken, baseUrl } = require('../utils');

module.exports = function registerSessionRoutes(app) {
  // ============ INSTRUCTOR: create a session ============
  app.post('/api/sessions', (req, res) => {
    const { name, durationMinutes } = req.body;
    if (!name || !durationMinutes) {
      return res.status(400).json({ error: 'name and durationMinutes are required' });
    }
    const id = uuidv4();
    const adminKey = genKey();
    const createdAt = now();
    const endsAt = createdAt + Math.round(Number(durationMinutes) * 60 * 1000);

    const session = { id, name, adminKey, createdAt, endsAt };
    db.sessions.create(session);

    res.json({ sessionId: id, adminKey, endsAt });
  });

  // ============ INSTRUCTOR: get/rotate current QR token ============
  app.get('/api/sessions/:id/token', (req, res) => {
    const session = db.sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'session not found' });
    if (session.adminKey !== req.query.adminKey) return res.status(403).json({ error: 'invalid admin key' });

    const t = now();
    if (t > session.endsAt) {
      return res.json({ ended: true });
    }

    let token = db.tokens.latestForSession(session.id);

    if (!token || t > token.expiresAt) {
      const tokenStr = genToken();
      const expiresAt = t + config.TOKEN_ACTIVE_SECONDS * 1000;
      token = { token: tokenStr, sessionId: session.id, createdAt: t, expiresAt };
      db.tokens.create(token);
    }

    const scanUrl = `${baseUrl(req)}/s/${token.token}`;
    QRCode.toDataURL(scanUrl, { margin: 1, width: 320 }, (err, dataUrl) => {
      if (err) return res.status(500).json({ error: 'qr generation failed' });
      res.json({
        ended: false,
        qr: dataUrl,
        expiresInSeconds: Math.max(0, Math.round((token.expiresAt - t) / 1000)),
        sessionEndsInSeconds: Math.max(0, Math.round((session.endsAt - t) / 1000)),
      });
    });
  });

  // ============ INSTRUCTOR: live stats ============
  app.get('/api/sessions/:id/stats', (req, res) => {
    const session = db.sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'session not found' });
    if (session.adminKey !== req.query.adminKey) return res.status(403).json({ error: 'invalid admin key' });

    const count = db.submissions.countForSession(session.id);
    const recent = db.submissions.recentForSession(session.id, 10)
      .map(s => ({ name: s.name, surname: s.surname, studentId: s.studentId, createdAt: s.createdAt }));
    res.json({ count, recent, sessionName: session.name, endsAt: session.endsAt });
  });

  // ============ INSTRUCTOR: export to Excel ============
  app.get('/api/sessions/:id/export', async (req, res) => {
    const session = db.sessions.get(req.params.id);
    if (!session) return res.status(404).send('Session not found');
    if (session.adminKey !== req.query.adminKey) return res.status(403).send('Invalid admin key');

    const rows = db.submissions.forSession(session.id);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Attendance');
    sheet.columns = [
      { header: 'Name', key: 'name', width: 18 },
      { header: 'Surname', key: 'surname', width: 18 },
      { header: 'Student ID', key: 'studentId', width: 18 },
      { header: 'Submitted At', key: 'submittedAt', width: 22 },
    ];
    sheet.getRow(1).font = { bold: true };

    rows.forEach(r => {
      sheet.addRow({
        name: r.name,
        surname: r.surname,
        studentId: r.studentId,
        submittedAt: new Date(r.createdAt).toLocaleString(),
      });
    });

    const safeName = session.name.replace(/[^a-z0-9]/gi, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_attendance.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  });
};
