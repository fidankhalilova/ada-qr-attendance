# QR Attendance App

A simple attendance system: instructor displays a rotating QR code, students scan
and submit their name/surname/Student ID, instructor downloads an Excel sheet.

Backend: Node.js + Express. Frontend: React (built with Vite), served by Express.

## Project structure

```
attendance-app/
  server.js                Backend entry point — middleware, routes, serves the built React app
  src/
    config.js                All tunable settings (reads env vars)
    utils.js                  Small shared helpers (time, tokens, signed cookies)
    db.js                      Storage layer (JSON file, async writes)
    routes/
      sessions.js               Instructor endpoints: create session, QR token, stats, export
      attendance.js              Student endpoints: scan check, submit
  client/                    React frontend (Vite)
    src/
      main.jsx                  App entry
      App.jsx                    Routes
      styles.css                  Shared styles
      pages/
        CreateSession.jsx          "/" and "/instructor" — create a session
        Display.jsx                  "/display" — classroom-screen QR display
        Scan.jsx                      "/s/:token" — student scan & submit form
    dist/                      Built output (run `npm run build` inside client/ — not checked in)
  data/
    attendance.json           Your data (auto-created, gitignored)
```

## How it prevents cheating

1. **QR rotates every 30 seconds.** Each code is only "live" for 30s, so a photo
   shared in a group chat is stale almost immediately. Once a code's 30 seconds
   is up, nobody new can open it — but a student who opened it *while it was
   still live* keeps up to 2 more minutes to finish filling out the form, even
   after the screen has moved on to a new code.
2. **The same live QR code can be opened by many students at once** — that's
   the normal case in a real classroom (everyone scans the one code on the
   screen together). This isn't a security hole: the expiry above already
   makes old codes useless, so restricting concurrent opens would only break
   legitimate use (300 students all scanning together) without adding safety.
3. **One Student ID per session, enforced in the database.** Even if a code
   gets shared, a given ID can only be submitted once per class.
4. **One submission per device per session.** Once a phone successfully
   submits, a cookie blocks any further submission from that same phone —
   even with a different name/ID typed in — for the rest of that session.
5. **IP address is logged per submission** (for your own troubleshooting) but
   not used to block anything automatically, since classroom/campus WiFi
   commonly shares one public IP across many students (NAT).

### Things this does NOT fully solve
- A student handing their *unlocked phone* to a friend to submit in person —
  no software fix for that, it's a supervision issue.
- Device-cookie protection can be bypassed by clearing cookies or using a
  private/incognito window.
- Tell students to scan the code as soon as it appears — a code about to
  rotate gives latecomers less time.

## Local setup

You need two installs and one build step, then a single command to run everything:

```bash
# 1. Backend dependencies
npm install

# 2. Frontend dependencies + build
cd client
npm install
npm run build
cd ..

# 3. Run
npm start
```

Then open `http://localhost:3000/` to create a session. Everything (instructor
page, classroom display, student scan page) is served by the one Express
server on port 3000 — there's no separate frontend server in production.

### Frontend development mode (optional)

If you want to edit the React code and see changes live without rebuilding
each time, run the backend (`npm start`) and, in a second terminal, run the
Vite dev server from inside `client/`:

```bash
cd client
npm run dev
```

This opens the app on its own port (usually 5173) and proxies `/api` calls to
your backend on port 3000. Once you're happy with changes, run `npm run
build` again so Express serves the updated version on port 3000.

## Deploying to a real server

Standard Node.js + Express app with a static React bundle — deploys anywhere
Node runs:

**Option A — Render / Railway / Fly.io (easiest)**
1. Push this folder to a GitHub repo (`.gitignore` excludes `node_modules`,
   `client/dist`, and your local data file).
2. Create a new Web Service pointing at it.
   - Build command: `npm install && cd client && npm install && npm run build && cd ..`
   - Start command: `npm start`
3. Set the environment variable `PUBLIC_BASE_URL` to your deployed URL
   (e.g. `https://your-app.onrender.com` or your custom domain) — this is
   what gets embedded in the QR codes.

**Option B — Your own VPS**
1. Install Node.js 18+, copy this folder over.
2. `npm install --production && cd client && npm install && npm run build && cd ..`
3. Run with a process manager: `npm install -g pm2 && pm2 start server.js --name attendance`
4. Put Nginx or Caddy in front for HTTPS (required for phone cameras/QR
   scanning) and set `PUBLIC_BASE_URL`.

## Handling ~300 students smoothly

- **Gzip compression** and **security headers** (`compression`, `helmet`).
- **Non-blocking storage** — reads hit an in-memory copy (instant); writes
  are queued and flushed to disk in the background, so a burst of 300
  simultaneous submissions never stalls the server. Tested with 50 concurrent
  submissions hitting the same live QR code at once — all succeeded.
- **Rate limiting on `/api/submit`** — blocks scripted/bot floods without
  punishing real students (tune `SUBMIT_RATE_LIMIT_PER_MIN`).
- **A single, always-on instance is enough at this scale.** Don't run
  multiple instances behind a load balancer with this JSON-file storage —
  each would have its own separate copy of the data. If you outgrow one
  instance, swap `src/db.js` for a real database (e.g. Postgres); nothing
  else needs to change.
- **Avoid free-tier "cold start" hosting** if possible — some free tiers
  sleep after inactivity and take 30+ seconds to wake on the first request,
  which is bad news if that first request is 300 students all scanning at
  the start of class. A small paid always-on instance (or waking it manually
  a minute before class) avoids this.
- The React bundle is small (~55KB gzipped) and served with compression, so
  300 phones loading it at once is not a meaningful load concern.

## Config knobs (`src/config.js`, overridable via env vars)

- `TOKEN_ACTIVE_SECONDS` — how long each QR code is "current" (default 30s)
- `SCAN_GRACE_SECONDS` — time to finish the form after scanning (default 120s)
- `SUBMIT_RATE_LIMIT_PER_MIN` — max submissions per IP per minute (default 60)
- `PUBLIC_BASE_URL` — your real domain, used when generating QR codes
- `COOKIE_SECRET` — set this to a fixed random string in production if you
  want scan-in-progress cookies to survive a server restart mid-class

## Security notes for production

- The "admin key" per session is a simple shared secret — fine for a solo
  instructor, but add real login if multiple instructors will use this.
- Back up or periodically export `data/attendance.json` if running long-term.
