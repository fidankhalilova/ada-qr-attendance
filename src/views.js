const { escapeHtml } = require('./utils');

function sharedStyles() {
  return `
    body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; background:#f4f5f7; margin:0; display:flex; min-height:100vh; align-items:center; justify-content:center; }
    .card { background:#fff; padding:32px 28px; border-radius:14px; box-shadow:0 2px 12px rgba(0,0,0,0.08); width:90%; max-width:380px; }
    h2 { margin-top:0; }
    label { display:block; margin:14px 0 6px; font-size:14px; color:#444; }
    input { width:100%; padding:10px 12px; border:1px solid #ccc; border-radius:8px; font-size:16px; box-sizing:border-box; }
    button { margin-top:20px; width:100%; padding:12px; border:none; border-radius:8px; background:#2563eb; color:#fff; font-size:16px; font-weight:600; cursor:pointer; }
    button:disabled { opacity:0.6; }
    .error { color:#dc2626; margin-top:12px; font-size:14px; }
  `;
}

function renderError(message) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Attendance</title>
  <style>${sharedStyles()}</style></head>
  <body><div class="card"><h2>⚠️ ${escapeHtml(message)}</h2></div></body></html>`;
}

function renderAlreadySubmitted() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Attendance</title>
  <style>${sharedStyles()}</style></head>
  <body><div class="card"><h2>Attendance recorded</h2><p>You can close this page.</p></div></body></html>`;
}

function renderForm(token) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mark Attendance</title>
  <style>${sharedStyles()}</style></head>
  <body>
  <div class="card">
    <h2>Mark Attendance</h2>
    <form id="f">
      <input type="hidden" name="token" value="${escapeHtml(token)}">
      <label>First Name</label>
      <input name="name" required autocomplete="given-name">
      <label>Surname</label>
      <input name="surname" required autocomplete="family-name">
      <label>Student ID</label>
      <input name="studentId" required autocomplete="off" inputmode="numeric">
      <button type="submit">Submit</button>
    </form>
    <div id="msg"></div>
  </div>
  <script>
    const f = document.getElementById('f');
    const msg = document.getElementById('msg');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(f).entries());
      f.querySelector('button').disabled = true;
      try {
        const r = await fetch('/api/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const j = await r.json();
        if (r.ok) {
          document.querySelector('.card').innerHTML = '<h2>Attendance recorded</h2><p>You can close this page.</p>';
        } else {
          msg.textContent = j.error || 'Something went wrong.';
          msg.className = 'error';
          f.querySelector('button').disabled = false;
        }
      } catch (err) {
        msg.textContent = 'Network error, please try again.';
        msg.className = 'error';
        f.querySelector('button').disabled = false;
      }
    });
  </script>
  </body></html>`;
}

module.exports = { renderError, renderAlreadySubmitted, renderForm, sharedStyles };
