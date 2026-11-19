# CodeDojo Daily — v2.0.0

A daily coding-challenge and team-practice web app. This upgrade keeps the original interface, 28 challenge catalogue, JavaScript/Python execution, teams, leaderboard, streaks and submission history while strengthening server-side reliability and adding automated tests.

## Requirements

- Node.js 18 or newer
- npm (included with Node.js)
- Internet connection only when the Python runner first loads Pyodide from jsDelivr

## Run locally (Windows)

1. Extract the ZIP.
2. Open the `codedojo-daily` folder in VS Code.
3. Open **Terminal → New Terminal**.
4. Run `node --version` and confirm Node 18 or newer.
5. Run `npm test` to execute the automated tests.
6. Run `npm start`.
7. Open `http://localhost:3000` in Chrome or Edge.

Stop the server with `Ctrl + C`.

## Automated quality checks

```bash
npm test       # unit and concurrency tests
npm run check  # JavaScript syntax checks plus tests
```

The tests cover input validation and concurrent writes to the community store. The store serializes mutations, writes to a temporary file, flushes it, and atomically renames it to avoid partially written JSON and lost updates from overlapping requests.

## What changed in v2

- **Data integrity:** queued/serialized database transactions; atomic file replacement; safe empty-database initialization; explicit storage errors.
- **Input validation:** strict server-side validation for team creation, joining and submissions; bounded text lengths; consistent pass/total checks; accepted status is derived from the test counts.
- **API protection:** request-size limit, per-IP rate limiting, same-origin checks for browser mutations, no wildcard CORS, and consistent API error responses.
- **HTTP hardening:** CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and cache controls.
- **Safer static file handling:** decoded paths are resolved against the public directory and traversal is rejected.
- **Automated tests:** Node's built-in test runner; no third-party runtime dependencies required.

## Important limitations (read before deployment)

This is a student/hackathon prototype, not a production service. It still uses a local JSON store rather than a managed relational database, and the display-name profile is not a real authenticated account system. Rate limiting and sessions are process-local, so they do not coordinate across multiple server instances. For public deployment, add real account registration/login with secure server-side sessions, CSRF tokens, a database such as PostgreSQL/SQLite, centralized rate limiting, HTTPS, audit logging, and CI-based tests. Do not expose this prototype to untrusted users or run arbitrary code on the server.

The code runner executes in a browser Web Worker, not on the Node.js server. Python is loaded from the Pyodide CDN and requires network access.

## Project structure

```text
codedojo-daily/
├── data/
│   ├── problems.json
│   └── community.json       # generated at runtime; ignored by Git
├── lib/
│   ├── store.js            # serialized, atomic JSON persistence
│   └── validation.js       # API input validation
├── public/
│   ├── app.js
│   ├── index.html
│   ├── runner.js
│   └── styles.css
├── test/
│   ├── store.test.js
│   └── validation.test.js
├── server.js
├── package.json
└── README.md
```

## GitHub upload

Create an empty GitHub repository, then run these commands in the project folder (replace the URL with your own repository URL):

```bash
git init
git add .
git commit -m "Upgrade CodeDojo Daily with validation, atomic storage and tests"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/codedojo-daily.git
git push -u origin main
```

The runtime community data file and environment secrets are excluded by `.gitignore`.
